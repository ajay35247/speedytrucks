/**
 * Freight Load Model
 * A "load" is a shipment posted by a Shipper.
 * Truck owners or brokers can bid on it.
 */

const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bidderRole: { type: String, enum: ["truck_owner", "broker"] },
    amount: { type: Number, required: true, min: 0 },
    message: { type: String, maxlength: 300 },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const loadSchema = new mongoose.Schema(
  {
    // ── Posting info ─────────────────────────────────────────
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    loadNumber: { type: String, unique: true }, // Auto-generated e.g. L-2026-00001

    // ── Cargo details ────────────────────────────────────────
    material: { type: String, required: true, trim: true, maxlength: 100 },
    weight: { type: Number, required: true, min: 0 },           // kg
    weightUnit: { type: String, enum: ["kg", "tons"], default: "kg" },
    quantity: { type: Number, default: 1 },
    dimensions: { length: Number, width: Number, height: Number }, // cm
    hazardous: { type: Boolean, default: false },
    refrigerated: { type: Boolean, default: false },

    // ── Route ────────────────────────────────────────────────
    origin: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      pincode: String,
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: [Number], // [lng, lat]
      },
    },
    destination: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      pincode: String,
      location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: [Number],
      },
    },
    distanceKm: Number,

    // ── Truck requirements ───────────────────────────────────
    truckType: {
      type: String,
      enum: ["mini_truck", "tempo", "open_truck", "closed_truck", "container", "tanker", "trailer"],
      required: true,
    },
    truckCapacity: Number, // tons

    // ── Pricing ──────────────────────────────────────────────
    expectedPrice: { type: Number, min: 0 }, // INR, shipper's budget
    finalPrice: { type: Number, min: 0 },    // Agreed price after bidding
    platformCommission: { type: Number, default: 0 }, // Calculated on booking

    // ── Schedule ─────────────────────────────────────────────
    pickupDate: { type: Date, required: true },
    deliveryDate: Date,

    // ── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "open",          // Accepting bids
        "bidding",       // Has bids
        "booked",        // Truck assigned
        "in_transit",    // On the road
        "delivered",     // Completed
        "cancelled",
        "disputed",
      ],
      default: "open",
    },

    // ── Assignment ───────────────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // truck owner
    assignedBid: { type: mongoose.Schema.Types.ObjectId },

    // ── Bidding ──────────────────────────────────────────────
    bids: [bidSchema],
    biddingDeadline: Date,

    // ── GPS Tracking ─────────────────────────────────────────
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: [Number],
      updatedAt: Date,
    },
    trackingHistory: [
      {
        coordinates: [Number],
        timestamp: { type: Date, default: Date.now },
        speed: Number, // km/h
        address: String,
      },
    ],

    // ── Payment ──────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ["pending", "advance_paid", "paid", "refunded"],
      default: "pending",
    },
    paymentId: String, // Razorpay order ID

    // ── Media ─────────────────────────────────────────────────
    images: [{ url: String, publicId: String }],

    // ── Notes ─────────────────────────────────────────────────
    specialInstructions: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────
loadSchema.index({ status: 1 });
loadSchema.index({ postedBy: 1 });
loadSchema.index({ "origin.city": 1, "destination.city": 1 });
loadSchema.index({ "origin.location": "2dsphere" });
loadSchema.index({ "destination.location": "2dsphere" });
loadSchema.index({ truckType: 1, pickupDate: 1 });

// ── Auto-generate load number ──────────────────────────────────
loadSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  const count = await mongoose.model("Load").countDocuments();
  this.loadNumber = `L-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  next();
});

module.exports = mongoose.model("Load", loadSchema);
