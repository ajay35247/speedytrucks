/**
 * Socket.io server — real-time chat, GPS tracking, notifications
 */
const jwt = require("jsonwebtoken");
const { Message, Conversation } = require("../models/Message.model");
const Booking = require("../models/Booking.model");
const Notification = require("../models/Notification.model");

const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
  // ── Auth middleware ──────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    console.log(`[Socket] User ${userId} connected`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // ── Chat: Join conversation room ─────────────────────────
    socket.on("chat:join", async ({ conversationId }) => {
      socket.join(`conv:${conversationId}`);
      // Mark messages as read
      await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
        { $push: { readBy: userId } }
      );
      io.to(`conv:${conversationId}`).emit("chat:read", { conversationId, userId });
    });

    // ── Chat: Send message ───────────────────────────────────
    socket.on("chat:send", async ({ conversationId, content, type = "text", metadata }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.map(String).includes(userId)) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content,
          type,
          metadata,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        const populated = await message.populate("sender", "name avatar");
        io.to(`conv:${conversationId}`).emit("chat:message", populated);

        // Notify offline participants
        conv.participants.forEach(async (participantId) => {
          const pid = participantId.toString();
          if (pid !== userId && !onlineUsers.has(pid)) {
            await Notification.create({
              user: pid,
              type: "system",
              title: "New message",
              body: content?.substring(0, 80) || "New message received",
              channels: ["push"],
            });
          }
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:leave", ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── GPS Tracking: Driver location update ─────────────────
    socket.on("tracking:update", async ({ bookingId, lat, lng, speed }) => {
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.driver?.toString() !== userId) return;

        await Booking.findByIdAndUpdate(bookingId, {
          "tracking.currentLat": lat,
          "tracking.currentLng": lng,
          "tracking.lastUpdated": new Date(),
          $push: {
            "tracking.history": { lat, lng, timestamp: new Date(), speed: speed || 0 }
          },
        });

        // Broadcast to shipper room
        io.to(`booking:${bookingId}`).emit("tracking:location", {
          bookingId, lat, lng, speed, timestamp: new Date()
        });
      } catch (err) {
        console.error("[Socket] tracking:update error", err);
      }
    });

    socket.on("tracking:join", ({ bookingId }) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on("tracking:leave", ({ bookingId }) => {
      socket.leave(`booking:${bookingId}`);
    });

    // ── Online status ────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  // Helper: emit notification to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  return io;
};
