import { Request, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkVerificationOtp, sendVerificationOtp } from '../lib/twilio';
import { createSessionId, hashToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../lib/jwt';
import { env } from '../config/env';
import { AppError } from '../types';
import { authLimiter, otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate';

const router = Router();
const phoneSchema = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Use E.164 format, e.g. +919876543210');
const roleSchema = z.enum(['DRIVER', 'SHIPPER', 'ADMIN']);
const sendOtpSchema = z.object({ mobile: phoneSchema });
const verifyOtpSchema = z.object({
  mobile: phoneSchema,
  otp: z.string().length(6),
  role: roleSchema,
  name: z.string().trim().min(2).max(80).optional(),
});
const refreshSchema = z.object({ refreshToken: z.string().min(20) });
const logoutSchema = z.object({ refreshToken: z.string().min(20).optional() });
const revokeSessionSchema = z.object({ sessionId: z.string().min(10) });

router.use(authLimiter);

async function getOtpRequest(mobile: string, action: string) {
  return prisma.otpRequest.upsert({
    where: { mobile_action: { mobile, action } },
    create: { mobile, action },
    update: {},
  });
}

function assertNotBlocked(record: { blockedUntil: Date | null }) {
  if (record.blockedUntil && record.blockedUntil > new Date()) {
    throw new AppError(429, 'OTP temporarily blocked. Try again later.', 'OTP_BLOCKED', { blockedUntil: record.blockedUntil });
  }
}

function getRequestMetadata(req: Request) {
  return {
    ipAddress: String(req.header('x-forwarded-for') || req.ip || '').slice(0, 120) || undefined,
    userAgent: String(req.header('user-agent') || '').slice(0, 500) || undefined,
  };
}

async function issueSessionTokens(req: Request, user: { id: string; name: string; mobile: string; role: 'DRIVER' | 'SHIPPER' | 'ADMIN' }) {
  const sessionId = createSessionId();
  const seed = { id: user.id, name: user.name, mobile: user.mobile, role: user.role, sessionId };
  const token = signAccessToken(seed);
  const refreshToken = signRefreshToken(seed);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const metadata = getRequestMetadata(req);

  await prisma.$transaction([
    prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        refreshTokenHash,
        expiresAt,
        lastSeenAt: new Date(),
        ...metadata,
      },
    }),
    prisma.refreshToken.create({
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

router.post('/send-otp', otpSendLimiter, validateBody(sendOtpSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof sendOtpSchema>;
  const record = await getOtpRequest(body.mobile, 'LOGIN');
  assertNotBlocked(record);

  const secondsSinceLastOtp = Math.floor((Date.now() - new Date(record.updatedAt).getTime()) / 1000);
  if (record.attempts > 0 && secondsSinceLastOtp < 60) {
    throw new AppError(429, 'Wait before retry', 'OTP_RETRY_TOO_SOON', { retryAfterSeconds: 60 - secondsSinceLastOtp });
  }

  if (record.attempts >= env.otpMaxSendAttempts) {
    const blockedUntil = new Date(Date.now() + env.otpBlockMinutes * 60 * 1000);
    await prisma.otpRequest.update({ where: { id: record.id }, data: { blockedUntil } });
    throw new AppError(429, 'Too many OTP send requests', 'OTP_SEND_LIMIT', { blockedUntil });
  }

  const verification = await sendVerificationOtp(body.mobile);

  await prisma.otpRequest.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 }, blockedUntil: null },
  });

  return res.json({ success: true, sid: verification.sid, status: verification.status, message: 'OTP dispatched successfully' });
}));

router.post('/verify-otp', otpVerifyLimiter, validateBody(verifyOtpSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof verifyOtpSchema>;
  const record = await getOtpRequest(body.mobile, 'LOGIN');
  assertNotBlocked(record);

  if (record.verifiedCount >= env.otpMaxVerifyAttempts) {
    const blockedUntil = new Date(Date.now() + env.otpBlockMinutes * 60 * 1000);
    await prisma.otpRequest.update({ where: { id: record.id }, data: { blockedUntil } });
    throw new AppError(429, 'Too many OTP verification attempts', 'OTP_VERIFY_LIMIT', { blockedUntil });
  }

  const check = await checkVerificationOtp(body.mobile, body.otp);
  await prisma.otpRequest.update({ where: { id: record.id }, data: { verifiedCount: { increment: 1 } } });

  if (check.status !== 'approved') {
    throw new AppError(401, 'Invalid or expired OTP', 'INVALID_OTP');
  }

  const user = await prisma.user.upsert({
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

  await prisma.otpRequest.update({ where: { id: record.id }, data: { attempts: 0, verifiedCount: 0, blockedUntil: null } });
  const session = await issueSessionTokens(req, user as { id: string; name: string; mobile: string; role: 'DRIVER' | 'SHIPPER' | 'ADMIN' });

  return res.json({
    user: { id: user.id, mobile: user.mobile, role: user.role, name: user.name, token: session.token, refreshToken: session.refreshToken },
  });
}));

router.post('/refresh-token', validateBody(refreshSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof refreshSchema>;
  const payload = verifyRefreshToken(body.refreshToken);
  const tokenHash = hashToken(body.refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  const session = await prisma.userSession.findUnique({ where: { sessionId: payload.sessionId } });

  if (!storedToken || !session) {
    throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.status !== 'ACTIVE' || storedToken.expiresAt < new Date() || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.sessionId !== payload.sessionId || session.refreshTokenHash !== tokenHash) {
    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', lastUsedAt: new Date() } }),
      prisma.userSession.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } }),
    ]);
    throw new AppError(401, 'Refresh token reuse detected. Session revoked.', 'REFRESH_TOKEN_REUSE');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'User is inactive or missing', 'INVALID_REFRESH_USER');
  }

  const nextSessionId = createSessionId();
  const seed = { id: user.id, name: user.name, mobile: user.mobile, role: user.role as 'DRIVER' | 'SHIPPER' | 'ADMIN', sessionId: nextSessionId };
  const token = signAccessToken(seed);
  const refreshToken = signRefreshToken(seed);
  const newHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const metadata = getRequestMetadata(req);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { status: 'ROTATED', lastUsedAt: new Date(), replacedById: newHash },
    }),
    prisma.userSession.update({
      where: { sessionId: payload.sessionId },
      data: { status: 'EXPIRED', revokedAt: new Date(), lastSeenAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: newHash, sessionId: nextSessionId, expiresAt },
    }),
    prisma.userSession.create({
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

router.post('/logout', requireAuth, validateBody(logoutSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof logoutSchema>;
  const data: { status: 'REVOKED'; lastUsedAt?: Date } = { status: 'REVOKED' };
  if (body.refreshToken) data.lastUsedAt = new Date();

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { userId: req.user!.id, sessionId: req.user!.sessionId },
      data: { status: 'REVOKED', revokedAt: new Date(), lastSeenAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, ...(body.refreshToken ? { tokenHash: hashToken(body.refreshToken) } : { sessionId: req.user!.sessionId }) },
      data,
    }),
  ]);

  return res.status(204).send();
}));

router.post('/logout-all', requireAuth, asyncHandler(async (req, res) => {
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', lastUsedAt: new Date() },
    }),
    prisma.userSession.updateMany({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date(), lastSeenAt: new Date() },
    }),
  ]);
  return res.status(204).send();
}));

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const sessions = await prisma.userSession.findMany({
    where: { userId: req.user!.id },
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

  return res.json({ items: sessions, currentSessionId: req.user!.sessionId });
}));

router.post('/revoke-session', requireAuth, validateBody(revokeSessionSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof revokeSessionSchema>;
  if (body.sessionId === req.user!.sessionId) throw new AppError(400, 'Use logout to revoke the current session', 'SELF_SESSION_REVOKE_BLOCKED');

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { userId: req.user!.id, sessionId: body.sessionId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, sessionId: body.sessionId, status: 'ACTIVE' },
      data: { status: 'REVOKED', lastUsedAt: new Date() },
    }),
  ]);

  return res.status(204).send();
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const authorization = req.header('authorization');
  const token = authorization!.slice(7);
  const decoded = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

  return res.json({ user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role, token } });
}));

export default router;
