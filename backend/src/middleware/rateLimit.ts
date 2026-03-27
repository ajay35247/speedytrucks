import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

function keyGenerator(req: Request) {
  return req.user?.id || String(req.header('x-forwarded-for') || req.ip || 'anonymous');
}

function buildLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: (req) => req.path === '/health' || req.path === '/healthz',
    message: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
  });
}

export const apiLimiter = buildLimiter(15 * 60 * 1000, 300);
export const authLimiter = buildLimiter(10 * 60 * 1000, 20);
export const otpSendLimiter = buildLimiter(10 * 60 * 1000, 5);
export const otpVerifyLimiter = buildLimiter(10 * 60 * 1000, 10);
export const paymentLimiter = buildLimiter(15 * 60 * 1000, 60);
