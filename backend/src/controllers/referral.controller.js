/**
 * Referral Controller
 */
const Referral = require("../models/Referral.model");
const User = require("../models/User.model");
const { sendSuccess, sendError } = require("../utils/response");
const { notify } = require("../services/notification.service");
const crypto = require("crypto");

// ── Generate referral code for user ──────────────────────────────
exports.getMyReferral = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let referral = await Referral.findOne({ referrer: userId, status: "pending", referee: null });

    if (!referral) {
      const code = (req.user.name.substring(0, 3) + crypto.randomBytes(3).toString("hex")).toUpperCase();
      referral = await Referral.create({ referrer: userId, code });
    }

    const completed = await Referral.countDocuments({ referrer: userId, status: { $in: ["completed","rewarded"] } });
    const totalEarned = completed * 200;

    sendSuccess(res, 200, "Referral info", {
      code: referral.code,
      link: `https://aptrucking.in/register?ref=${referral.code}`,
      completedReferrals: completed,
      totalEarned,
    });
  } catch (err) { next(err); }
};

// ── Apply referral code during registration ───────────────────────
exports.applyReferral = async (req, res, next) => {
  try {
    const { code, newUserId } = req.body;
    const referral = await Referral.findOne({ code, status: "pending" });
    if (!referral) return sendError(res, 404, "Invalid referral code");

    referral.referee = newUserId;
    referral.status = "completed";
    referral.completedAt = new Date();
    await referral.save();

    // Credit referrer wallet
    await User.findByIdAndUpdate(referral.referrer, {
      $inc: { walletBalance: 200 },
    });

    referral.rewardPaid = true;
    referral.rewardPaidAt = new Date();
    referral.status = "rewarded";
    await referral.save();

    await notify({
      userId: referral.referrer,
      type: "referral_reward",
      title: "Referral Bonus! 🎉",
      body: "₹200 credited to your wallet for a successful referral!",
      channels: ["push"],
    });

    sendSuccess(res, 200, "Referral applied", {});
  } catch (err) { next(err); }
};

// ── Get referral leaderboard ──────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const leaders = await Referral.aggregate([
      { $match: { status: "rewarded" } },
      { $group: { _id: "$referrer", count: { $sum: 1 }, earned: { $sum: "$rewardAmount" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { "user.name": 1, "user.avatar": 1, count: 1, earned: 1 } },
    ]);
    sendSuccess(res, 200, "Leaderboard", { leaders });
  } catch (err) { next(err); }
};
