/**
 * Truck Model — fleet registered by truck owners
 */
const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  registrationNumber: { type: String, required: true, unique: true, uppercase: true },
  model:        { type: String, required: true },
  manufacturer: String,
  year:         Number,
  type:         { type: String, enum: ["mini", "small", "medium", "large", "trailer"], required: true },
  capacity:     { type: Number, required: true },  // tonnes
  dimensions:   { length: Number, width: Number, height: Number },

  // ── Current Location ──────────────────────────────────────────
  currentLocation: {
    lat:     Number,
    lng:     Number,
    address: String,
    updatedAt: Date,
  },

  // ── Availability ──────────────────────────────────────────────
  status:         { type: String, enum: ["available", "in_transit", "maintenance", "inactive"], default: "available" },
  availableFrom:  Date,
  availableRoutes: [{ from: String, to: String }],

  // ── Driver ────────────────────────────────────────────────────
  driverName:   String,
  driverPhone:  String,
  driverLicense: String,

  // ── Documents ─────────────────────────────────────────────────
  rc:           String,  // Cloudinary URL
  insurance:    String,
  fitnessExpiry: Date,
  pollutionExpiry: Date,

  // ── Ratings ───────────────────────────────────────────────────
  rating:     { type: Number, default: 0, min: 0, max: 5 },
  totalTrips: { type: Number, default: 0 },
  reviews:    [{ user: mongoose.Schema.Types.ObjectId, rating: Number, comment: String, date: Date }],
}, {
  timestamps: true,
});

truckSchema.index({ owner: 1 });
truckSchema.index({ status: 1, type: 1 });
truckSchema.index({ "currentLocation.lat": 1, "currentLocation.lng": 1 });

module.exports = mongoose.model("Truck", truckSchema);
