/**
 * GPS Tracking Routes
 */
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const Truck = require("../models/Truck.model");
const FreightLoad = require("../models/FreightLoad.model");
const { sendSuccess, sendError } = require("../utils/response");

// Update truck GPS location (truck owner / driver)
router.post("/update", protect, async (req, res, next) => {
  try {
    const { truckId, lat, lng, address } = req.body;
    const truck = await Truck.findById(truckId);
    if (!truck) return sendError(res, 404, "Truck not found.");
    if (truck.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return sendError(res, 403, "Not authorized.");
    }
    truck.currentLocation = { lat, lng, address, updatedAt: new Date() };
    await truck.save();
    sendSuccess(res, 200, "Location updated.", { location: truck.currentLocation });
  } catch (err) { next(err); }
});

// Get current location of load
router.get("/load/:loadId", protect, async (req, res, next) => {
  try {
    const load = await FreightLoad.findById(req.params.loadId).populate("assignedTruck");
    if (!load) return sendError(res, 404, "Load not found.");
    if (!load.assignedTruck) return sendError(res, 404, "No truck assigned yet.");
    sendSuccess(res, 200, "Tracking data.", {
      location: load.assignedTruck.currentLocation,
      truckId: load.assignedTruck._id,
      status: load.status,
    });
  } catch (err) { next(err); }
});

module.exports = router;