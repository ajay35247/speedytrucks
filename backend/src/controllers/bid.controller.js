/**
 * Bid Controller — freight bidding system
 */
const Bid = require("../models/Bid.model");
const FreightLoad = require("../models/FreightLoad.model");
const { log } = require("../services/audit.service");
const { sendSuccess, sendError } = require("../utils/response");

// ── PLACE BID ─────────────────────────────────────────────────
exports.placeBid = async (req, res, next) => {
  try {
    const { loadId, amount, message, estimatedDelivery, truckId } = req.body;
    const load = await FreightLoad.findById(loadId);
    if (!load) return sendError(res, 404, "Load not found.");
    if (!["open", "bidding"].includes(load.status)) return sendError(res, 400, "Bidding is closed for this load.");
    if (load.shipper.toString() === req.user._id.toString()) return sendError(res, 400, "Cannot bid on your own load.");

    const existing = await Bid.findOne({ load: loadId, bidder: req.user._id, status: "pending" });
    if (existing) return sendError(res, 409, "You already have an active bid on this load. Withdraw it first.");

    const bid = await Bid.create({
      load: loadId, bidder: req.user._id, truck: truckId,
      amount, message, estimatedDelivery,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24hr
    });

    load.status = "bidding";
    await load.save();

    await log({ userId: req.user._id, action: "PLACE_BID", resourceId: bid._id, detail: `₹${amount} on load ${loadId}` });
    sendSuccess(res, 201, "Bid placed.", { bid });
  } catch (err) { next(err); }
};

// ── GET BIDS FOR A LOAD ───────────────────────────────────────
exports.getLoadBids = async (req, res, next) => {
  try {
    const load = await FreightLoad.findById(req.params.loadId);
    if (!load) return sendError(res, 404, "Load not found.");
    // Only shipper or admin can see all bids
    if (load.shipper.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, 403, "Not authorized.");
    }
    const bids = await Bid.find({ load: req.params.loadId })
      .populate("bidder", "name company rating phone")
      .populate("truck")
      .sort({ amount: 1 });
    sendSuccess(res, 200, "Bids fetched.", { bids });
  } catch (err) { next(err); }
};

// ── ACCEPT BID ────────────────────────────────────────────────
exports.acceptBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id).populate("load");
    if (!bid) return sendError(res, 404, "Bid not found.");
    if (bid.load.shipper.toString() !== req.user._id.toString()) return sendError(res, 403, "Not authorized.");

    bid.status = "accepted";
    await bid.save();

    // Assign load to bidder and set final rate
    await FreightLoad.findByIdAndUpdate(bid.load._id, {
      status: "assigned", assignedTo: bid.bidder, assignedTruck: bid.truck, finalRate: bid.amount,
      commission: Math.round(bid.amount * 0.05), // 5% platform commission
    });

    // Reject all other bids
    await Bid.updateMany({ load: bid.load._id, _id: { $ne: bid._id } }, { status: "rejected" });

    await log({ userId: req.user._id, action: "ACCEPT_BID", resourceId: bid._id });
    sendSuccess(res, 200, "Bid accepted. Load assigned.", { bid });
  } catch (err) { next(err); }
};

// ── WITHDRAW BID ──────────────────────────────────────────────
exports.withdrawBid = async (req, res, next) => {
  try {
    const bid = await Bid.findById(req.params.id);
    if (!bid) return sendError(res, 404, "Bid not found.");
    if (bid.bidder.toString() !== req.user._id.toString()) return sendError(res, 403, "Not authorized.");
    if (bid.status !== "pending") return sendError(res, 400, "Can only withdraw pending bids.");
    bid.status = "withdrawn";
    await bid.save();
    sendSuccess(res, 200, "Bid withdrawn.");
  } catch (err) { next(err); }
};

// ── MY BIDS ───────────────────────────────────────────────────
exports.myBids = async (req, res, next) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .populate("load", "title pickup delivery pickupDate budget status")
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, "Your bids.", { bids });
  } catch (err) { next(err); }
};