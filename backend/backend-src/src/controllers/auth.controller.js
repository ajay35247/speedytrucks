/**
 * Auth Controller — register, login, OTP, refresh, logout, password reset
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { sendOTP, verifyOTP } = require("../services/otp.service");
const { sendEmail, passwordResetEmail, welcomeEmail } = require("../services/email.service");
const { log } = require("../services/audit.service");
const { generateAccessToken, generateRefreshToken, setTokenCookies } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");

const getIP = (req) => req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

// ── REGISTER ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, company } = req.body;

    // Validate role (users can only self-register as shipper/owner/broker)
    if (!["shipper", "owner", "broker"].includes(role)) {
      return sendError(res, 400, "Invalid role.");
    }

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return sendError(res, 409, existing.email === email ? "Email already registered." : "Phone already registered.");
    }

    const user = await User.create({ name, email, phone, password, role, company, status: "pending_kyc" });

    // Send welcome email (non-blocking)
    sendEmail({ to: email, ...welcomeEmail(name, role) }).catch(() => {});

    // Send OTP for phone verification
    await sendOTP(phone, "register");

    await log({ userId: user._id, action: "REGISTER", ip: getIP(req), status: "success", detail: `New ${role} registration` });

    sendSuccess(res, 201, "Account created. Please verify your phone with the OTP sent.", {
      userId: user._id,
      phoneVerificationRequired: true,
    });
  } catch (err) { next(err); }
};

// ── VERIFY PHONE OTP ──────────────────────────────────────────
exports.verifyPhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const result = await verifyOTP(phone, otp, "register");
    if (!result.valid) return sendError(res, 400, result.message);

    const user = await User.findOneAndUpdate(
      { phone },
      { isPhoneVerified: true, status: "pending_kyc" },
      { new: true }
    ).select("-password");

    if (!user) return sendError(res, 404, "User not found.");

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    await log({ userId: user._id, action: "PHONE_VERIFY", ip: getIP(req), status: "success" });
    sendSuccess(res, 200, "Phone verified.", { user, accessToken });
  } catch (err) { next(err); }
};

// ── LOGIN (Email + Password) ───────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = getIP(req);

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return sendError(res, 401, "Invalid email or password.");
    }

    // Check lockout
    if (user.isLocked()) {
      return sendError(res, 423, "Account temporarily locked due to failed attempts. Try again in 30 minutes.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // lock 30 min
      }
      await user.save();
      await log({ userId: user._id, action: "LOGIN_FAILED", ip, status: "fail", detail: `Wrong password (attempt ${user.failedLoginAttempts})` });
      return sendError(res, 401, "Invalid email or password.");
    }

    if (user.status === "banned") return sendError(res, 403, "Account banned. Contact support.");
    if (user.status === "suspended") return sendError(res, 403, "Account suspended. Contact support.");

    // 2FA check
    if (user.twoFactorEnabled) {
      await sendOTP(user.phone, "login");
      return sendSuccess(res, 200, "OTP sent to registered phone for 2FA.", {
        twoFactorRequired: true,
        userId: user._id,
      });
    }

    // Reset failed attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    const userData = user.toObject();
    delete userData.password;

    await log({ userId: user._id, action: "LOGIN", ip, status: "success" });
    sendSuccess(res, 200, "Login successful.", { user: userData, accessToken });
  } catch (err) { next(err); }
};

// ── OTP LOGIN (Passwordless) ───────────────────────────────────
exports.requestOTPLogin = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return sendError(res, 404, "No account found with this phone number.");
    await sendOTP(phone, "login");
    sendSuccess(res, 200, "OTP sent to your phone.", { userId: user._id });
  } catch (err) { next(err); }
};

exports.verifyOTPLogin = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const result = await verifyOTP(phone, otp, "login");
    if (!result.valid) return sendError(res, 400, result.message);

    const user = await User.findOneAndUpdate(
      { phone },
      { lastLogin: new Date(), $inc: { loginCount: 1 } },
      { new: true }
    ).select("-password");

    if (!user) return sendError(res, 404, "User not found.");
    if (user.status === "banned") return sendError(res, 403, "Account banned.");

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    await log({ userId: user._id, action: "OTP_LOGIN", ip: getIP(req), status: "success" });
    sendSuccess(res, 200, "OTP login successful.", { user, accessToken });
  } catch (err) { next(err); }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return sendError(res, 401, "No refresh token.");

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, 401, "User not found.");

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    setTokenCookies(res, accessToken, refreshToken);

    sendSuccess(res, 200, "Tokens refreshed.", { accessToken });
  } catch (err) {
    if (err.name === "TokenExpiredError") return sendError(res, 401, "Refresh token expired. Please log in again.");
    next(err);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    await log({ userId: req.user?._id, action: "LOGOUT", ip: getIP(req), status: "success" });
    sendSuccess(res, 200, "Logged out successfully.");
  } catch (err) { next(err); }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Always return success (prevents user enumeration)
    if (!user) return sendSuccess(res, 200, "If that email exists, a reset link has been sent.");

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await sendEmail({ to: email, ...passwordResetEmail(user.name, resetURL) });

    await log({ userId: user._id, action: "FORGOT_PASSWORD", ip: getIP(req) });
    sendSuccess(res, 200, "Password reset link sent to your email.");
  } catch (err) { next(err); }
};

// ── RESET PASSWORD ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) return sendError(res, 400, "Invalid or expired reset token.");

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await log({ userId: user._id, action: "PASSWORD_RESET", ip: getIP(req), status: "success" });
    sendSuccess(res, 200, "Password reset successful. Please log in with your new password.");
  } catch (err) { next(err); }
};

// ── GET CURRENT USER ──────────────────────────────────────────
exports.getMe = async (req, res) => {
  sendSuccess(res, 200, "Profile fetched.", { user: req.user });
};