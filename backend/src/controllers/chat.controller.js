/**
 * Chat Controller — conversations and message history
 */
const { Message, Conversation } = require("../models/Message.model");
const { sendSuccess, sendError } = require("../utils/response");

// ── Get or create conversation ───────────────────────────────────
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId, loadId } = req.body;
    const userId = req.user._id;

    if (participantId === userId.toString())
      return sendError(res, 400, "Cannot chat with yourself");

    let conv = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
      ...(loadId ? { load: loadId } : {}),
    }).populate("participants", "name avatar role")
      .populate("lastMessage");

    if (!conv) {
      conv = await Conversation.create({
        participants: [userId, participantId],
        load: loadId || undefined,
      });
      conv = await conv.populate("participants", "name avatar role");
    }

    sendSuccess(res, 200, "Conversation fetched", { conversation: conv });
  } catch (err) { next(err); }
};

// ── Get user's conversations ─────────────────────────────────────
exports.getMyConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const convs = await Conversation.find({ participants: userId, isActive: true })
      .populate("participants", "name avatar role")
      .populate("lastMessage")
      .populate("load", "title pickup delivery")
      .sort({ lastActivity: -1 })
      .limit(50);

    sendSuccess(res, 200, "Conversations fetched", { conversations: convs });
  } catch (err) { next(err); }
};

// ── Get messages in conversation ─────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.participants.map(String).includes(userId.toString()))
      return sendError(res, 403, "Not authorized");

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Mark as read
    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );

    sendSuccess(res, 200, "Messages fetched", { messages: messages.reverse() });
  } catch (err) { next(err); }
};
