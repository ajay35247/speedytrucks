"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const twilio_1 = require("../lib/twilio");
const jwt_1 = require("../lib/jwt");
const env_1 = require("../config/env");
const types_1 = require("../types");
const rateLimit_1 = require("../middleware/rateLimit");
const auth_1 = require("../middleware/auth");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const phoneSchema = zod_1.z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, e.g. +919876543210');
const roleSchema = zod_1.z.enum(['DRIVER', 'SHIPPER', 'ADMIN']);
const sendOtpSchema = zod_1.z.object({ mobile: phoneSchema });
const verifyOtpSchema = zod_1.z.object({
    mobile: phoneSchema,
    otp: zod_1.z.string().length(6),
    role: roleSchema,
    name: zod_1.z.string().trim().min(2).max(80).optional(),
});
const refreshSchema = zod_1.z.object({ refreshToken: zod_1.z.string().min(20) });
const logoutSchema = zod_1.z.object({ refreshToken: zod_1.z.string().min(20).optional() });
const revokeSessionSchema = zod_1.z.object({ sessionId: zod_1.z.string().min(10) });
router.use(rateLimit_1.authLimiter);
async function getOtpRequest(mobile, action) {
    return prisma_1.prisma.otpRequest.upsert({
        where: { mobile_action: { mobile, action } },
        create: { mobile, action },
        update: {},
    });
}
function assertNotBlocked(record) {
    if (record.blockedUntil && record.blockedUntil > new Date()) {
        throw new types_1.AppError(429, 'OTP temporarily blocked. Try again later.', 'OTP_BLOCKED', { blockedUntil: record.blockedUntil });
    }
}
function getRequestMetadata(req) {
    return {
        ipAddress: String(req.header('x-forwarded-for') || req.ip || '').slice(0, 120) || undefined,
        userAgent: String(req.header('user-agent') || '').slice(0, 500) || undefined,
    };
}
async function issueSessionTokens(req, user) {
    const sessionId = (0, jwt_1.createSessionId)();
    const seed = { id: user.id, name: user.name, mobile: user.mobile, role: user.role, sessionId };
    const token = (0, jwt_1.signAccessToken)(seed);
    const refreshToken = (0, jwt_1.signRefreshToken)(seed);
    const refreshTokenHash = (0, jwt_1.hashToken)(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const metadata = getRequestMetadata(req);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.userSession.create({
            data: {
                userId: user.id,
                sessionId,
                refreshTokenHash,
                expiresAt,
                lastSeenAt: new Date(),
                ...metadata,
            },
        }),
        prisma_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: refreshTokenHash,
                sessionId,
                expiresAt,
            },
        }),
    ]);
    return { token, refreshToken, sessionId };
}
router.post('/send-otp', rateLimit_1.otpSendLimiter, (0, validate_1.validateBody)(sendOtpSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const record = await getOtpRequest(body.mobile, 'LOGIN');
    assertNotBlocked(record);
    const secondsSinceLastOtp = Math.floor((Date.now() - new Date(record.updatedAt).getTime()) / 1000);
    if (record.attempts > 0 && secondsSinceLastOtp < 60) {
        throw new types_1.AppError(429, 'Wait before retry', 'OTP_RETRY_TOO_SOON', { retryAfterSeconds: 60 - secondsSinceLastOtp });
    }
    if (record.attempts >= env_1.env.otpMaxSendAttempts) {
        const blockedUntil = new Date(Date.now() + env_1.env.otpBlockMinutes * 60 * 1000);
        await prisma_1.prisma.otpRequest.update({ where: { id: record.id }, data: { blockedUntil } });
        throw new types_1.AppError(429, 'Too many OTP send requests', 'OTP_SEND_LIMIT', { blockedUntil });
    }
    const verification = await (0, twilio_1.sendVerificationOtp)(body.mobile);
    await prisma_1.prisma.otpRequest.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 }, blockedUntil: null },
    });
    return res.json({ success: true, sid: verification.sid, status: verification.status, message: 'OTP dispatched successfully' });
}));
router.post('/verify-otp', rateLimit_1.otpVerifyLimiter, (0, validate_1.validateBody)(verifyOtpSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const record = await getOtpRequest(body.mobile, 'LOGIN');
    assertNotBlocked(record);
    if (record.verifiedCount >= env_1.env.otpMaxVerifyAttempts) {
        const blockedUntil = new Date(Date.now() + env_1.env.otpBlockMinutes * 60 * 1000);
        await prisma_1.prisma.otpRequest.update({ where: { id: record.id }, data: { blockedUntil } });
        throw new types_1.AppError(429, 'Too many OTP verification attempts', 'OTP_VERIFY_LIMIT', { blockedUntil });
    }
    const check = await (0, twilio_1.checkVerificationOtp)(body.mobile, body.otp);
    await prisma_1.prisma.otpRequest.update({ where: { id: record.id }, data: { verifiedCount: { increment: 1 } } });
    if (check.status !== 'approved') {
        throw new types_1.AppError(401, 'Invalid or expired OTP', 'INVALID_OTP');
    }
    const user = await prisma_1.prisma.user.upsert({
        where: { mobile: body.mobile },
        create: {
            mobile: body.mobile,
            name: body.name || body.role.toLowerCase().replace(/^./, (s) => s.toUpperCase()) + ' User',
            role: body.role,
            status: 'ACTIVE',
        },
        update: {
            role: body.role,
            ...(body.name ? { name: body.name } : {}),
            status: 'ACTIVE',
        },
    });
    await prisma_1.prisma.otpRequest.update({ where: { id: record.id }, data: { attempts: 0, verifiedCount: 0, blockedUntil: null } });
    const session = await issueSessionTokens(req, user);
    return res.json({
        user: { id: user.id, mobile: user.mobile, role: user.role, name: user.name, token: session.token, refreshToken: session.refreshToken },
    });
}));
router.post('/refresh-token', (0, validate_1.validateBody)(refreshSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const payload = (0, jwt_1.verifyRefreshToken)(body.refreshToken);
    const tokenHash = (0, jwt_1.hashToken)(body.refreshToken);
    const storedToken = await prisma_1.prisma.refreshToken.findUnique({ where: { tokenHash } });
    const session = await prisma_1.prisma.userSession.findUnique({ where: { sessionId: payload.sessionId } });
    if (!storedToken || !session) {
        throw new types_1.AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
    }
    if (storedToken.status !== 'ACTIVE' || storedToken.expiresAt < new Date() || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
        throw new types_1.AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
    }
    if (storedToken.sessionId !== payload.sessionId || session.refreshTokenHash !== tokenHash) {
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.refreshToken.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', lastUsedAt: new Date() } }),
            prisma_1.prisma.userSession.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } }),
        ]);
        throw new types_1.AppError(401, 'Refresh token reuse detected. Session revoked.', 'REFRESH_TOKEN_REUSE');
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.status !== 'ACTIVE') {
        throw new types_1.AppError(401, 'User is inactive or missing', 'INVALID_REFRESH_USER');
    }
    const nextSessionId = (0, jwt_1.createSessionId)();
    const seed = { id: user.id, name: user.name, mobile: user.mobile, role: user.role, sessionId: nextSessionId };
    const token = (0, jwt_1.signAccessToken)(seed);
    const refreshToken = (0, jwt_1.signRefreshToken)(seed);
    const newHash = (0, jwt_1.hashToken)(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const metadata = getRequestMetadata(req);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { status: 'ROTATED', lastUsedAt: new Date(), replacedById: newHash },
        }),
        prisma_1.prisma.userSession.update({
            where: { sessionId: payload.sessionId },
            data: { status: 'EXPIRED', revokedAt: new Date(), lastSeenAt: new Date() },
        }),
        prisma_1.prisma.refreshToken.create({
            data: { userId: user.id, tokenHash: newHash, sessionId: nextSessionId, expiresAt },
        }),
        prisma_1.prisma.userSession.create({
            data: {
                userId: user.id,
                sessionId: nextSessionId,
                refreshTokenHash: newHash,
                expiresAt,
                lastSeenAt: new Date(),
                ...metadata,
            },
        }),
    ]);
    return res.json({ token, refreshToken });
}));
router.post('/logout', auth_1.requireAuth, (0, validate_1.validateBody)(logoutSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const data = { status: 'REVOKED' };
    if (body.refreshToken)
        data.lastUsedAt = new Date();
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.userSession.updateMany({
            where: { userId: req.user.id, sessionId: req.user.sessionId },
            data: { status: 'REVOKED', revokedAt: new Date(), lastSeenAt: new Date() },
        }),
        prisma_1.prisma.refreshToken.updateMany({
            where: { userId: req.user.id, ...(body.refreshToken ? { tokenHash: (0, jwt_1.hashToken)(body.refreshToken) } : { sessionId: req.user.sessionId }) },
            data,
        }),
    ]);
    return res.status(204).send();
}));
router.post('/logout-all', auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.refreshToken.updateMany({
            where: { userId: req.user.id, status: 'ACTIVE' },
            data: { status: 'REVOKED', lastUsedAt: new Date() },
        }),
        prisma_1.prisma.userSession.updateMany({
            where: { userId: req.user.id, status: 'ACTIVE' },
            data: { status: 'REVOKED', revokedAt: new Date(), lastSeenAt: new Date() },
        }),
    ]);
    return res.status(204).send();
}));
router.get('/sessions', auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const sessions = await prisma_1.prisma.userSession.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
            sessionId: true,
            status: true,
            ipAddress: true,
            userAgent: true,
            lastSeenAt: true,
            expiresAt: true,
            createdAt: true,
        },
    });
    return res.json({ items: sessions, currentSessionId: req.user.sessionId });
}));
router.post('/revoke-session', auth_1.requireAuth, (0, validate_1.validateBody)(revokeSessionSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    if (body.sessionId === req.user.sessionId)
        throw new types_1.AppError(400, 'Use logout to revoke the current session', 'SELF_SESSION_REVOKE_BLOCKED');
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.userSession.updateMany({
            where: { userId: req.user.id, sessionId: body.sessionId },
            data: { status: 'REVOKED', revokedAt: new Date() },
        }),
        prisma_1.prisma.refreshToken.updateMany({
            where: { userId: req.user.id, sessionId: body.sessionId, status: 'ACTIVE' },
            data: { status: 'REVOKED', lastUsedAt: new Date() },
        }),
    ]);
    return res.status(204).send();
}));
router.get('/me', auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authorization = req.header('authorization');
    const token = authorization.slice(7);
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user)
        throw new types_1.AppError(404, 'User not found', 'USER_NOT_FOUND');
    return res.json({ user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role, token } });
}));
exports.default = router;
