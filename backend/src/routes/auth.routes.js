/**
 * Auth Routes
 */
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { authLimiter, otpLimiter, passwordResetLimiter } = require("../middlewares/rateLimiter");
const { body } = require("express-validator");

// Registration
router.post("/register",  authLimiter, ctrl.register);
router.post("/verify-phone", otpLimiter, ctrl.verifyPhone);

// Standard login
router.post("/login", authLimiter, ctrl.login);

// OTP login (passwordless)
router.post("/otp/request", otpLimiter, ctrl.requestOTPLogin);
router.post("/otp/verify",  otpLimiter, ctrl.verifyOTPLogin);

// Token management
router.post("/refresh", ctrl.refreshToken);
router.post("/logout",  protect, ctrl.logout);

// Password management
router.post("/forgot-password", passwordResetLimiter, ctrl.forgotPassword);
router.post("/reset-password",  ctrl.resetPassword);

// Current user
router.get("/me", protect, ctrl.getMe);

module.exports = router;