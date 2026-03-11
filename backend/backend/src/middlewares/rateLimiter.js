import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Rate limit exceeded. Slow down.' },
});
