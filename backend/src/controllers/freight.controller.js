/**
 * Freight Controller — post loads, search, match, manage
 */
const FreightLoad = require("../models/FreightLoad.model");
const Bid = require("../models/Bid.model");
const { log } = require("../services/audit.service");
const { sendSuccess, sendError } = require("../utils/response");

// ── POST LOAD ─────────────────────────────────────────────────
exports.postLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.create({ ...req.body, shipper: req.user._id });
    await log({ userId: req.user._id, action: "POST_LOAD", resourceId: load._id, detail: load.title });
    sendSuccess(res, 201, "Load posted successfully.", { load });
  } catch (err) { next(err); }
};

// ── SEARCH / LIST LOADS ───────────────────────────────────────
exports.getLoads = async (req, res, next) => {
  try {
    const { from, to, date, truckType, status = "open", page = 1, limit = 20, minBudget, maxBudget } = req.query;
    const filter = { status };
    if (from) filter["pickup.city"] = { $regex: from, $options: "i" };
    if (to)   filter["delivery.city"] = { $regex: to, $options: "i" };
    if (truckType) filter.truckType = truckType;
    if (date) filter.pickupDate = { $gte: new Date(date) };
    if (minBudget || maxBudget) {
      filter.budget = {};
      if (minBudget) filter.budget.$gte = parseInt(minBudget);
      if (maxBudget) filter.budget.$lte = parseInt(maxBudget);
    }

    const loads = await FreightLoad.find(filter)
      .populate("shipper", "name company rating")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FreightLoad.countDocuments(filter);
    sendSuccess(res, 200, "Loads fetched.", { loads, total, page: parseInt(page) });
  } catch (err) { next(err); }
};

// ── GET SINGLE LOAD ───────────────────────────────────────────
exports.getLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.findById(req.params.id)
      .populate("shipper", "name company phone email rating")
      .populate("assignedTo", "name phone")
      .populate("assignedTruck");
    if (!load) return sendError(res, 404, "Load not found.");
    sendSuccess(res, 200, "Load fetched.", { load });
  } catch (err) { next(err); }
};

// ── UPDATE LOAD ───────────────────────────────────────────────
exports.updateLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.findById(req.params.id);
    if (!load) return sendError(res, 404, "Load not found.");
    if (load.shipper.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, 403, "Not authorized.");
    }
    if (!["open", "bidding"].includes(load.status)) {
      return sendError(res, 400, "Cannot edit a load that is in transit or completed.");
    }
    Object.assign(load, req.body);
    await load.save();
    sendSuccess(res, 200, "Load updated.", { load });
  } catch (err) { next(err); }
};

// ── CANCEL LOAD ───────────────────────────────────────────────
exports.cancelLoad = async (req, res, next) => {
  try {
    const load = await FreightLoad.findById(req.params.id);
    if (!load) return sendError(res, 404, "Load not found.");
    if (load.shipper.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, 403, "Not authorized.");
    }
    if (load.status === "in_transit") return sendError(res, 400, "Cannot cancel a load that is in transit.");
    load.status = "cancelled";
    await load.save();
    await log({ userId: req.user._id, action: "CANCEL_LOAD", resourceId: load._id });
    sendSuccess(res, 200, "Load cancelled.");
  } catch (err) { next(err); }
};

// ── MY LOADS (Shipper) ────────────────────────────────────────
exports.myLoads = async (req, res, next) => {
  try {
    const loads = await FreightLoad.find({ shipper: req.user._id }).sort({ createdAt: -1 });
    sendSuccess(res, 200, "Your loads.", { loads });
  } catch (err) { next(err); }
};