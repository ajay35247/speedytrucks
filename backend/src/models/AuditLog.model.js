/**
 * AuditLog Model — all critical user actions logged to MongoDB
 */
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },       // LOGIN, LOGOUT, POST_LOAD, BID, etc.
  resource:  String,                               // resource affected
  resourceId: mongoose.Schema.Types.ObjectId,
  ip:     String,
  userAgent: String,
  status: { type: String, enum: ["success", "fail", "pending"], default: "success" },
  detail: String,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
