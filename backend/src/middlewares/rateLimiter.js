const rateLimit = require("express-rate-limit");
const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Too many requests." } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, skipSuccessfulRequests: true, message: { success: false, message: "Too many auth attempts. Try again in 15 minutes." } });
const otpLimiter = rateLimit({ windowMs: 10*60*1000, max: 5, message: { success: false, message: "Too many OTP requests." } });
const passwordResetLimiter = rateLimit({ windowMs: 60*60*1000, max: 3, message: { success: false, message: "Too many password reset requests." } });
module.exports = { globalLimiter, authLimiter, otpLimiter, passwordResetLimiter };