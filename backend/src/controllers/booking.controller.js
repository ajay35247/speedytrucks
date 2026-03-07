/**
 * Booking Controller — full lifecycle management
 */
const Booking = require("../models/Booking.model");
const FreightLoad = require("../models/FreightLoad.model");
const { sendSuccess, sendError } = require("../utils/response");
const { notify, notifyDelivery, notifyPaymentDone } = require("../services/notification.service");
const { log } = require("../services/audit.service");
const crypto = require("crypto");

const genOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// ── Get my bookings ────────────────────────────────────────────
exports.getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    const query = {
      $or: [{ shipper: userId }, { driver: userId }],
      ...(status ? { status } : {}),
    };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate("load", "title pickup delivery weight")
        .populate("driver", "name phone avatar")
        .populate("shipper", "name phone")
        .populate("truck", "number type")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ]);

    sendSuccess(res, 200, "Bookings fetched", { bookings, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ── Get single booking ─────────────────────────────────────────
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("load")
      .populate("driver", "name phone avatar rating")
      .populate("shipper", "name phone company")
      .populate("truck");

    if (!booking) return sendError(res, 404, "Booking not found");

    const userId = req.user._id.toString();
    const isParty = [booking.shipper?._id, booking.driver?._id, booking.fleetOwner]
      .map(String).includes(userId);
    if (!isParty && req.user.role !== "admin") return sendError(res, 403, "Forbidden");

    sendSuccess(res, 200, "Booking fetched", { booking });
  } catch (err) { next(err); }
};

// ── Update booking status ──────────────────────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id.toString();

    const booking = await Booking.findById(id).populate("load");
    if (!booking) return sendError(res, 404, "Booking not found");

    const allowedTransitions = {
      driver: ["pickup_started", "driver_arrived", "loading", "in_transit", "delivered"],
      shipper: ["cancelled"],
      admin: ["cancelled", "disputed"],
    };

    const role = req.user.role;
    if (!allowedTransitions[role]?.includes(status)) {
      return sendError(res, 403, "Status transition not allowed");
    }

    const timelineKey = {
      pickup_started: "pickupStartedAt",
      driver_arrived: "driverArrivedAt",
      loading: "loadingAt",
      in_transit: "inTransitAt",
      delivered: "deliveredAt",
      cancelled: "cancelledAt",
    }[status];

    booking.status = status;
    if (timelineKey) booking.timeline[timelineKey] = new Date();
    if (status === "cancelled") booking.cancelledBy = userId;

    await booking.save();

    if (status === "delivered") {
      // Auto-payout to driver
      const driverPayout = booking.driverPayout || booking.agreedAmount * 0.9;
      await notifyDelivery(booking.shipper.toString(), id);
      await notifyPaymentDone(booking.driver.toString(), driverPayout);
    }

    await log({ userId, action: `BOOKING_${status.toUpperCase()}`, status: "success", detail: `Booking ${id}` });
    sendSuccess(res, 200, `Booking ${status}`, { booking });
  } catch (err) { next(err); }
};

// ── Verify OTP (pickup/delivery confirmation) ──────────────────
exports.verifyOTP = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp, stage } = req.body; // stage: "pickup" | "delivery"

    const booking = await Booking.findById(id);
    if (!booking) return sendError(res, 404, "Booking not found");

    if (booking.otp[stage] !== otp) return sendError(res, 400, "Invalid OTP");

    booking.otp[`${stage}Verified`] = true;
    if (stage === "delivery") booking.status = "delivered";
    await booking.save();

    sendSuccess(res, 200, `${stage} OTP verified`, { booking });
  } catch (err) { next(err); }
};

// ── Submit review ─────────────────────────────────────────────
exports.submitReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id.toString();

    const booking = await Booking.findById(id);
    if (!booking) return sendError(res, 404, "Booking not found");
    if (booking.status !== "delivered") return sendError(res, 400, "Can only review completed bookings");

    if (booking.shipper.toString() === userId) {
      booking.review.shipperRating = rating;
      booking.review.shipperComment = comment;
    } else if (booking.driver?.toString() === userId) {
      booking.review.driverRating = rating;
      booking.review.driverComment = comment;
    }

    await booking.save();
    sendSuccess(res, 200, "Review submitted", {});
  } catch (err) { next(err); }
};
