/**
 * Transaction Model – Wallet & Payment ledger
 */

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "credit",        // Money added to wallet
        "debit",         // Money deducted
        "payment",       // Load payment
        "payout",        // Withdrawal to bank/UPI
        "commission",    // Platform commission deducted
        "refund",
        "advance",
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    balanceBefore: Number,
    balanceAfter: Number,
    description: { type: String, required: true },
    loadId: { type: mongoose.Schema.Types.ObjectId, ref: "Load" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending",
    },
    upiId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ loadId: 1 });

/**
 * Audit Log Model – All user & system actions
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin acting on behalf
    action: {
      type: String,
      enum: [
        "LOGIN", "LOGOUT", "LOGIN_FAILED", "REGISTER",
        "PASSWORD_RESET", "PASSWORD_CHANGE", "OTP_SENT", "OTP_VERIFIED",
        "2FA_ENABLED", "2FA_DISABLED",
        "KYC_SUBMITTED", "KYC_APPROVED", "KYC_REJECTED",
        "USER_SUSPENDED", "USER_ACTIVATED", "USER_BANNED",
        "LOAD_POSTED", "LOAD_CANCELLED", "LOAD_BOOKED", "LOAD_DELIVERED",
        "BID_PLACED", "BID_ACCEPTED", "BID_REJECTED",
        "PAYMENT_INITIATED", "PAYMENT_SUCCESS", "PAYMENT_FAILED",
        "PAYOUT_REQUESTED", "PAYOUT_COMPLETED",
        "WALLET_CREDIT", "WALLET_DEBIT",
        "LOCATION_UPDATE",
        "ADMIN_ACTION",
      ],
      required: true,
    },
    ip: String,
    userAgent: String,
    status: { type: String, enum: ["success", "fail", "pending"], default: "success" },
    detail: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = { Transaction, AuditLog };
