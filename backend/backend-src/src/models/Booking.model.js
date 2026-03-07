const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  load: { type: mongoose.Schema.Types.ObjectId, ref: "FreightLoad", required: true },
  bid: { type: mongoose.Schema.Types.ObjectId, ref: "Bid" },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  truck: { type: mongoose.Schema.Types.ObjectId, ref: "Truck" },
  fleetOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: {
    type: String,
    enum: ["confirmed","driver_assigned","pickup_started","driver_arrived","loading","in_transit","delivered","cancelled","disputed"],
    default: "confirmed"
  },
  agreedAmount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  driverPayout: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["pending","paid","refunded"], default: "pending" },
  paymentId: String,
  razorpayOrderId: String,
  tracking: {
    currentLat: Number,
    currentLng: Number,
    lastUpdated: Date,
    history: [{ lat: Number, lng: Number, timestamp: Date, speed: Number }],
  },
  timeline: {
    confirmedAt: Date,
    driverAssignedAt: Date,
    pickupStartedAt: Date,
    driverArrivedAt: Date,
    loadingAt: Date,
    inTransitAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  otp: {
    pickup: String,
    delivery: String,
    pickupVerified: { type: Boolean, default: false },
    deliveryVerified: { type: Boolean, default: false },
  },
  review: {
    shipperRating: { type: Number, min: 1, max: 5 },
    shipperComment: String,
    driverRating: { type: Number, min: 1, max: 5 },
    driverComment: String,
  },
  cancelReason: String,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: String,
  invoiceUrl: String,
}, { timestamps: true });

bookingSchema.index({ shipper: 1, status: 1 });
bookingSchema.index({ driver: 1, status: 1 });
bookingSchema.index({ load: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
