"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentLimiter = exports.otpVerifyLimiter = exports.otpSendLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
function keyGenerator(req) {
    return req.user?.id || String(req.header('x-forwarded-for') || req.ip || 'anonymous');
}
function buildLimiter(windowMs, limit) {
    return (0, express_rate_limit_1.default)({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator,
        skip: (req) => req.path === '/health' || req.path === '/healthz',
        message: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
    });
}
exports.apiLimiter = buildLimiter(15 * 60 * 1000, 300);
exports.authLimiter = buildLimiter(10 * 60 * 1000, 20);
exports.otpSendLimiter = buildLimiter(10 * 60 * 1000, 5);
exports.otpVerifyLimiter = buildLimiter(10 * 60 * 1000, 10);
exports.paymentLimiter = buildLimiter(15 * 60 * 1000, 60);
