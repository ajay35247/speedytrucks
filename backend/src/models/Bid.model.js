/**
 * Bid Model — freight bidding between shippers and truck owners
 */
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema({
  load:      { type: mongoose.Schema.Types.ObjectId, ref: "FreightLoad", required: true },
  bidder:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  truck:     { type: mongoose.Schema.Types.ObjectId, ref: "Truck" },
  amount:    { type: Number, required: true },
  message:   String,
  estimatedDelivery: Date,
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "withdrawn", "countered"],
    default: "pending",
  },
  counterAmount: Number,   // if shipper counters the bid
  expiresAt: Date,
}, {
  timestamps: true,
});

bidSchema.index({ load: 1, bidder: 1 });
bidSchema.index({ bidder: 1, status: 1 });

module.exports = mongoose.model("Bid", bidSchema);
