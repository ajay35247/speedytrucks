/**
 * User Routes — profile management
 */
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const User = require("../models/User.model");
const { sendSuccess, sendError } = require("../utils/response");

// Update profile
router.patch("/profile", protect, async (req, res, next) => {
  try {
    const allowed = ["name", "company", "gstNumber"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select("-password");
    sendSuccess(res, 200, "Profile updated.", { user });
  } catch (err) { next(err); }
});

// Change password (authenticated)
router.patch("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 401, "Current password is incorrect.");
    user.password = newPassword;
    await user.save();
    sendSuccess(res, 200, "Password changed successfully.");
  } catch (err) { next(err); }
});

// Toggle 2FA
router.patch("/2fa", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();
    sendSuccess(res, 200, `2FA ${user.twoFactorEnabled ? "enabled" : "disabled"}.`, { twoFactorEnabled: user.twoFactorEnabled });
  } catch (err) { next(err); }
});

module.exports = router;