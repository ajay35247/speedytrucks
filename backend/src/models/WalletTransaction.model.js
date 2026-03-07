/**
 * WalletTransaction Model — tracks all wallet credits/debits
 */
const mongoose = require("mongoose");

const walletTxSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:          { type: String, enum: ["credit", "debit"], required: true },
  amount:        { type: Number, required: true, min: 0 },
  balanceBefore: Number,
  balanceAfter:  Number,
  description:   String,
  category:      { type: String, enum: ["payment", "refund", "commission", "withdrawal", "topup"] },
  referenceId:   String,   // Razorpay payment ID, load ID, etc.
  status:        { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
}, {
  timestamps: true,
});

walletTxSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTxSchema);
