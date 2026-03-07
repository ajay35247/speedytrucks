/**
 * FreightLoad Model — posted loads in the marketplace
 */
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  pincode: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
}, { _id: false });

const freightLoadSchema = new mongoose.Schema({
  // ── Ownership ─────────────────────────────────────────────────
  shipper:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // truck owner
  assignedTruck: { type: mongoose.Schema.Types.ObjectId, ref: "Truck" },

  // ── Load Details ──────────────────────────────────────────────
  title:       { type: String, required: true },
  description: String,
  category:    { type: String, enum: ["general", "fragile", "hazardous", "perishable", "heavy", "liquid"], default: "general" },
  weight:      { type: Number, required: true },   // in tonnes
  volume:      Number,                             // in cubic feet
  dimensions:  { length: Number, width: Number, height: Number },

  // ── Route ─────────────────────────────────────────────────────
  pickup:     { type: locationSchema, required: true },
  delivery:   { type: locationSchema, required: true },
  distance:   Number,   // km, auto-calculated

  // ── Schedule ──────────────────────────────────────────────────
  pickupDate:   { type: Date, required: true },
  deliveryDate: Date,

  // ── Pricing ───────────────────────────────────────────────────
  budget:    { type: Number, required: true },   // shipper's max budget in INR
  finalRate: Number,                              // agreed rate after bidding
  commission: { type: Number, default: 0 },      // platform commission in INR

  // ── Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["open", "bidding", "assigned", "in_transit", "delivered", "cancelled", "disputed"],
    default: "open",
  },

  // ── Payment ───────────────────────────────────────────────────
  paymentStatus: { type: String, enum: ["pending", "paid", "released", "refunded"], default: "pending" },
  razorpayOrderId: String,

  // ── Truck requirements ────────────────────────────────────────
  truckType:    { type: String, enum: ["mini", "small", "medium", "large", "trailer"], default: "medium" },
  specialReqs:  [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

freightLoadSchema.index({ status: 1, pickupDate: 1 });
freightLoadSchema.index({ "pickup.city": 1, "delivery.city": 1 });
freightLoadSchema.index({ shipper: 1 });

module.exports = mongoose.model("FreightLoad", freightLoadSchema);
