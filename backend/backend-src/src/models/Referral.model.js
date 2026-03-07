const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  referee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  code: { type: String, required: true, unique: true, uppercase: true },
  status: { type: String, enum: ["pending","completed","rewarded"], default: "pending" },
  rewardAmount: { type: Number, default: 200 },
  rewardPaid: { type: Boolean, default: false },
  rewardPaidAt: Date,
  refereeEmail: String,
  refereePhone: String,
  completedAt: Date,
}, { timestamps: true });

referralSchema.index({ referrer: 1 });
referralSchema.index({ code: 1 });

module.exports = mongoose.model("Referral", referralSchema);
