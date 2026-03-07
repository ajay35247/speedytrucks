/**
 * Admin Controller — user management, KYC approval, audit logs, stats
 */
const User = require("../models/User.model");
const KYC = require("../models/KYC.model");
const AuditLog = require("../models/AuditLog.model");
const { log } = require("../services/audit.service");
const { sendEmail } = require("../services/email.service");
const { sendSuccess, sendError } = require("../utils/response");

// ── GET ALL USERS ─────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    sendSuccess(res, 200, "Users fetched.", {
      users, total, page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) { next(err); }
};

// ── SUSPEND USER ──────────────────────────────────────────────
exports.suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (id === req.user._id.toString()) return sendError(res, 400, "Cannot suspend yourself.");

    const user = await User.findByIdAndUpdate(id, { status: "suspended", suspendReason: reason }, { new: true }).select("-password");
    if (!user) return sendError(res, 404, "User not found.");

    // Notify user via email
    sendEmail({
      to: user.email,
      subject: "SpeedyTrucks — Account Suspended",
      html: `<p>Hi ${user.name}, your account has been suspended. Reason: <strong>${reason || "Policy violation"}</strong>. Contact support@speedytrucks.in to appeal.</p>`,
    }).catch(() => {});

    await log({ userId: req.user._id, action: "SUSPEND_USER", resourceId: user._id, detail: `Suspended: ${user.email}. Reason: ${reason}` });
    sendSuccess(res, 200, "User suspended.", { user });
  } catch (err) { next(err); }
};

// ── REINSTATE USER ────────────────────────────────────────────
exports.reinstateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { status: "active", suspendReason: undefined }, { new: true }).select("-password");
    if (!user) return sendError(res, 404, "User not found.");
    await log({ userId: req.user._id, action: "REINSTATE_USER", resourceId: user._id, detail: `Reinstated: ${user.email}` });
    sendSuccess(res, 200, "User reinstated.", { user });
  } catch (err) { next(err); }
};

// ── APPROVE KYC ───────────────────────────────────────────────
exports.approveKYC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kyc = await KYC.findOneAndUpdate(
      { user: id },
      { overallStatus: "approved", approvedAt: new Date(), "pan.status": "approved", "drivingLicense.status": "approved", "rc.status": "approved" },
      { new: true }
    );
    if (!kyc) return sendError(res, 404, "KYC record not found.");

    await User.findByIdAndUpdate(id, { kycStatus: "approved", status: "active" });
    const user = await User.findById(id);

    sendEmail({
      to: user.email,
      subject: "SpeedyTrucks — KYC Approved ✅",
      html: `<p>Hi ${user.name}, your KYC verification has been approved! You can now access all platform features.</p>`,
    }).catch(() => {});

    await log({ userId: req.user._id, action: "APPROVE_KYC", resourceId: id });
    sendSuccess(res, 200, "KYC approved.", { kyc });
  } catch (err) { next(err); }
};

// ── REJECT KYC ────────────────────────────────────────────────
exports.rejectKYC = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const kyc = await KYC.findOneAndUpdate({ user: id }, { overallStatus: "rejected", adminNote: reason }, { new: true });
    if (!kyc) return sendError(res, 404, "KYC record not found.");
    await User.findByIdAndUpdate(id, { kycStatus: "rejected" });
    await log({ userId: req.user._id, action: "REJECT_KYC", resourceId: id, detail: reason });
    sendSuccess(res, 200, "KYC rejected.", { kyc });
  } catch (err) { next(err); }
};

// ── ADMIN RESET PASSWORD ──────────────────────────────────────
exports.adminResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const user = await User.findById(id);
    if (!user) return sendError(res, 404, "User not found.");
    user.password = newPassword;
    await user.save();
    await log({ userId: req.user._id, action: "ADMIN_RESET_PASSWORD", resourceId: id });
    sendSuccess(res, 200, "Password reset by admin.");
  } catch (err) { next(err); }
};

// ── GET AUDIT LOGS ────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(filter);
    sendSuccess(res, 200, "Audit logs fetched.", { logs, total, page: parseInt(page) });
  } catch (err) { next(err); }
};

// ── PLATFORM STATS ────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, pendingKYC, usersByRole] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ kycStatus: "pending" }),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    ]);

    sendSuccess(res, 200, "Stats fetched.", {
      totalUsers, activeUsers, pendingKYC,
      usersByRole: usersByRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    });
  } catch (err) { next(err); }
};