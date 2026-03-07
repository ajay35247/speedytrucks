/**
 * Truck Routes
 */
const express = require("express");
const router = express.Router();
const { protect, authorize, requireKYC } = require("../middlewares/auth.middleware");
const Truck = require("../models/Truck.model");
const { sendSuccess, sendError } = require("../utils/response");

// List available trucks
router.get("/", protect, async (req, res, next) => {
  try {
    const { type, city, page = 1, limit = 20 } = req.query;
    const filter = { status: "available" };
    if (type) filter.type = type;
    const trucks = await Truck.find(filter)
      .populate("owner", "name company rating phone")
      .limit(limit * 1).skip((page - 1) * limit);
    const total = await Truck.countDocuments(filter);
    sendSuccess(res, 200, "Trucks fetched.", { trucks, total });
  } catch (err) { next(err); }
});

// Register truck
router.post("/", protect, authorize("owner"), requireKYC, async (req, res, next) => {
  try {
    const truck = await Truck.create({ ...req.body, owner: req.user._id });
    sendSuccess(res, 201, "Truck registered.", { truck });
  } catch (err) { next(err); }
});

// My fleet
router.get("/my", protect, authorize("owner"), async (req, res, next) => {
  try {
    const trucks = await Truck.find({ owner: req.user._id });
    sendSuccess(res, 200, "Your fleet.", { trucks });
  } catch (err) { next(err); }
});

module.exports = router;