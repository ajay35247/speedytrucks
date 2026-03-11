import crypto from 'crypto';
import User from '../models/User.model.js';
import { signAccess, signRefresh, verifyRefresh, setRefreshCookie } from '../utils/jwt.js';
import { ok, err } from '../utils/response.js';
import { sendOTP, verifyOTP } from '../services/otp.service.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service.js';
import { log } from '../services/audit.service.js';

const issueTokens = (user, res) => {
  const payload = { id: user._id, role: user.role };
  const access  = signAccess(payload);
  const refresh = signRefresh(payload);
  setRefreshCookie(res, refresh);
  return { token: access, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, kycStatus: user.kycStatus, company: user.company, walletBalance: user.walletBalance } };
};

// POST /auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, company } = req.body;
    if (!name || !email || !password) return err(res, 'Name, email and password are required', 400);

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return err(res, 'Email already registered', 409);

    const user = await User.create({ name, email, password, phone: phone || '', role: role || 'shipper', company: company || '' });
    await sendWelcomeEmail(email, name).catch(() => {});
    await log(user._id, 'USER_REGISTERED', { email, role: user.role });

    const data = issueTokens(user, res);
    return ok(res, data, 'Account created successfully', 201);
  } catch (e) { next(e); }
};

// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return err(res, 'Email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    if (!user) return err(res, 'Invalid email or password', 401);
    if (user.isLocked()) return err(res, 'Account locked. Try again in 30 minutes.', 423);
    if (user.status === 'suspended') return err(res, 'Account suspended. Contact support.', 403);

    const valid = await user.comparePassword(password);
    if (!valid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      return err(res, 'Invalid email or password', 401);
    }

    user.loginAttempts = 0; user.lockUntil = undefined;
    await user.save();
    await log(user._id, 'USER_LOGIN', { email });

    const data = issueTokens(user, res);
    return ok(res, data, 'Login successful');
  } catch (e) { next(e); }
};

// POST /auth/otp/request
export const requestOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return err(res, 'Phone number required', 400);
    await sendOTP(phone);
    return ok(res, {}, 'OTP sent successfully');
  } catch (e) { return err(res, e.message, 500); }
};

// POST /auth/otp/verify
export const verifyOTPLogin = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return err(res, 'Phone and OTP required', 400);
    await verifyOTP(phone, otp);

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ name: 'New User', email: `${phone.replace('+', '')}@aptrucking.in`, password: crypto.randomBytes(16).toString('hex'), phone, phoneVerified: true });
    } else {
      user.phoneVerified = true; await user.save();
    }

    await log(user._id, 'OTP_LOGIN', { phone });
    const data = issueTokens(user, res);
    return ok(res, data, 'OTP login successful');
  } catch (e) { return err(res, e.message, 400); }
};

// POST /auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return err(res, 'No refresh token', 401);
    const decoded = verifyRefresh(token);
    const user = await User.findById(decoded.id);
    if (!user) return err(res, 'User not found', 401);
    const data = issueTokens(user, res);
    return ok(res, { token: data.token }, 'Token refreshed');
  } catch { return err(res, 'Invalid refresh token', 401); }
};

// POST /auth/logout
export const logout = (req, res) => {
  res.clearCookie('refreshToken');
  return ok(res, {}, 'Logged out');
};

// GET /auth/me
export const me = async (req, res) => {
  return ok(res, { user: req.user }, 'User fetched');
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return ok(res, {}, 'If that email exists, a reset link was sent');
    const token  = crypto.randomBytes(32).toString('hex');
    user.resetToken  = crypto.createHash('sha256').update(token).digest('hex');
    user.resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, url);
    return ok(res, {}, 'Password reset email sent');
  } catch (e) { next(e); }
};

// POST /auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return err(res, 'Token and password required', 400);
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetToken: hashed, resetExpiry: { $gt: new Date() } }).select('+resetToken +resetExpiry');
    if (!user) return err(res, 'Invalid or expired reset token', 400);
    user.password    = password;
    user.resetToken  = undefined;
    user.resetExpiry = undefined;
    await user.save();
    return ok(res, {}, 'Password reset successfully');
  } catch (e) { next(e); }
};
