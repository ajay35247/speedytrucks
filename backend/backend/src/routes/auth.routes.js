import { Router } from 'express';
import { register, login, requestOTP, verifyOTPLogin, refresh, logout, me, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { loginLimiter, otpLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/register',        register);
router.post('/login',           loginLimiter, login);
router.post('/otp/request',     otpLimiter, requestOTP);
router.post('/otp/verify',      otpLimiter, verifyOTPLogin);
router.post('/refresh',         refresh);
router.post('/logout',          logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);
router.get('/me',               protect, me);

export default router;
