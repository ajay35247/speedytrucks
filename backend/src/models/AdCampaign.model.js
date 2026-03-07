const mongoose = require("mongoose");

const adCampaignSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["banner","sidebar","sponsored_truck","sponsored_load"], required: true },
  status: { type: String, enum: ["draft","active","paused","completed","rejected"], default: "draft" },
  pricingModel: { type: String, enum: ["cpc","cpm","fixed"], required: true },
  budget: { type: Number, required: true, min: 100 },
  spent: { type: Number, default: 0 },
  cpcRate: { type: Number, default: 5 },
  cpmRate: { type: Number, default: 50 },
  fixedPrice: { type: Number },
  targetLocations: [String],
  targetRoles: [{ type: String, enum: ["shipper","owner","broker"] }],
  creative: {
    imageUrl: String,
    title: String,
    description: String,
    ctaText: String,
    ctaUrl: String,
  },
  stats: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: Date,
  rejectionReason: String,
}, { timestamps: true });

adCampaignSchema.index({ status: 1, type: 1 });
adCampaignSchema.index({ advertiser: 1 });

module.exports = mongoose.model("AdCampaign", adCampaignSchema);
