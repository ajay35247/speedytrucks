/**
 * KYC Model — Know Your Customer document verification
 */
const mongoose = require("mongoose");

const docSchema = new mongoose.Schema({
  url:        String,   // Cloudinary URL
  status:     { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
}, { _id: false });

const kycSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  pan:        docSchema,
  drivingLicense: docSchema,
  rc:         docSchema,   // Registration Certificate (for truck owners)
  gst:        docSchema,
  aadhaar:    docSchema,
  selfie:     docSchema,   // live selfie for identity match

  overallStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "pending" },
  submittedAt: Date,
  approvedAt: Date,
  adminNote:   String,
}, {
  timestamps: true,
});

module.exports = mongoose.model("KYC", kycSchema);
