/**
 * Ads Controller — campaign management, impressions, clicks
 */
const AdCampaign = require("../models/AdCampaign.model");
const { sendSuccess, sendError } = require("../utils/response");

// ── Get active ads (public, served to users) ─────────────────────
exports.getActiveAds = async (req, res, next) => {
  try {
    const { type, location } = req.query;
    const now = new Date();
    const query = {
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: { $lt: ["$spent", "$budget"] },
      ...(type ? { type } : {}),
    };

    const ads = await AdCampaign.find(query)
      .select("name type creative stats pricingModel")
      .limit(6);

    // Record impressions
    const impressionOps = ads.map(ad => ({
      updateOne: {
        filter: { _id: ad._id },
        update: { $inc: { "stats.impressions": 1 }, $set: { "stats.ctr": ad.stats.clicks / (ad.stats.impressions + 1) } },
      }
    }));
    if (impressionOps.length) AdCampaign.bulkWrite(impressionOps).catch(() => {});

    sendSuccess(res, 200, "Ads fetched", { ads });
  } catch (err) { next(err); }
};

// ── Record click ─────────────────────────────────────────────────
exports.recordClick = async (req, res, next) => {
  try {
    const { adId } = req.params;
    const ad = await AdCampaign.findById(adId);
    if (!ad || ad.status !== "active") return sendError(res, 404, "Ad not found");

    const clickCost = ad.pricingModel === "cpc" ? ad.cpcRate : 0;
    await AdCampaign.findByIdAndUpdate(adId, {
      $inc: { "stats.clicks": 1, spent: clickCost },
      $set: { "stats.ctr": (ad.stats.clicks + 1) / Math.max(ad.stats.impressions, 1) },
    });

    sendSuccess(res, 200, "Click recorded", { redirectUrl: ad.creative?.ctaUrl });
  } catch (err) { next(err); }
};

// ── Advertiser: create campaign ───────────────────────────────────
exports.createCampaign = async (req, res, next) => {
  try {
    const { name, type, pricingModel, budget, cpcRate, cpmRate, fixedPrice,
            targetLocations, targetRoles, creative, startDate, endDate } = req.body;

    const campaign = await AdCampaign.create({
      advertiser: req.user._id, name, type, pricingModel, budget,
      cpcRate, cpmRate, fixedPrice, targetLocations, targetRoles,
      creative, startDate, endDate, status: "draft",
    });

    sendSuccess(res, 201, "Campaign created. Pending admin approval.", { campaign });
  } catch (err) { next(err); }
};

// ── Advertiser: get my campaigns ─────────────────────────────────
exports.getMyCampaigns = async (req, res, next) => {
  try {
    const campaigns = await AdCampaign.find({ advertiser: req.user._id }).sort({ createdAt: -1 });
    sendSuccess(res, 200, "Campaigns fetched", { campaigns });
  } catch (err) { next(err); }
};

// ── Admin: approve/reject campaign ───────────────────────────────
exports.reviewCampaign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    const update = action === "approve"
      ? { status: "active", approvedBy: req.user._id, approvedAt: new Date() }
      : { status: "rejected", rejectionReason };

    const campaign = await AdCampaign.findByIdAndUpdate(id, update, { new: true });
    if (!campaign) return sendError(res, 404, "Campaign not found");

    sendSuccess(res, 200, `Campaign ${action}d`, { campaign });
  } catch (err) { next(err); }
};

// ── Admin: get all campaigns ──────────────────────────────────────
exports.getAllCampaigns = async (req, res, next) => {
  try {
    const { status } = req.query;
    const campaigns = await AdCampaign.find(status ? { status } : {})
      .populate("advertiser", "name email")
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, "All campaigns", { campaigns });
  } catch (err) { next(err); }
};
