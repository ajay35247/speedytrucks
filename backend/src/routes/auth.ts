import { Request, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { checkVerificationOtp, sendVerificationOtp } from '../lib/twilio';
import { createSessionId, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
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
const refreshSchema = z.object({ refreshToken: z.string().min(20).optional() });
const logoutSchema = z.object({ refreshToken: z.string().min(20).optional() });
const revokeSessionSchema = z.object({ sessionId: z.string().min(10) });
const REFRESH_COOKIE_NAME = 'ap_refresh_token';
const SESSION_TRANSPORT_COOKIE_ONLY = 'cookie-only';

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

function parseCookieHeader(cookieHeader: string | undefined) {
  const entries = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf('=');
      return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    });
  return Object.fromEntries(entries);
}


function wantsCookieOnlyTransport(req: Request) {
  return String(req.header('x-session-transport') || '').trim().toLowerCase() === SESSION_TRANSPORT_COOKIE_ONLY;
}

function getRefreshTokenFromRequest(req: Request, explicit?: string) {
  const bodyToken = explicit?.trim();
  if (bodyToken) return bodyToken;
  const cookies = parseCookieHeader(req.header('cookie'));
  return cookies[REFRESH_COOKIE_NAME] || '';
}

function appendCookie(res: any, cookie: string) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookie]);
    return;
  }
  res.setHeader('Set-Cookie', [String(current), cookie]);
}

function setRefreshCookie(req: Request, res: any, refreshToken: string) {
  const origin = String(req.header('origin') || '').trim();
  const secure = env.isProduction || /^https:/i.test(origin);
  const sameSite = secure ? 'None' : 'Lax';
  appendCookie(res, `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; Max-Age=${30 * 24 * 60 * 60}; Path=/; HttpOnly; SameSite=${sameSite};${secure ? ' Secure;' : ''}`);
}

function clearRefreshCookie(req: Request, res: any) {
  const origin = String(req.header('origin') || '').trim();
  const secure = env.isProduction || /^https:/i.test(origin);
  const sameSite = secure ? 'None' : 'Lax';
  appendCookie(res, `${REFRESH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=${sameSite};${secure ? ' Secure;' : ''}`);
}

async function resolveVerifiedUser(body: z.infer<typeof verifyOtpSchema>) {
  const existing = await prisma.user.findUnique({ where: { mobile: body.mobile } });

  if (existing) {
    if (existing.role !== body.role) {
      if (existing.role === 'ADMIN' || body.role === 'ADMIN') {
        throw new AppError(403, 'Admin role assignment cannot happen through OTP login.', 'ADMIN_ROLE_LOCKED');
      }
      throw new AppError(403, 'Role changes require an approved back-office workflow.', 'ROLE_CHANGE_NOT_ALLOWED');
    }

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        status: 'ACTIVE',
      },
    });
  }

  if (body.role === 'ADMIN') {
    throw new AppError(403, 'Admin signup is blocked. Admin accounts must be seeded or promoted through a controlled back-office workflow.', 'ADMIN_SIGNUP_BLOCKED');
  }

  return prisma.user.create({
    data: {
      mobile: body.mobile,
      name: body.name || body.role.toLowerCase().replace(/^./, (s) => s.toUpperCase()) + ' User',
      role: body.role,
      status: 'ACTIVE',
    },
  });
}

type SessionTokenResult = { token: string; refreshToken?: string; sessionId: string };

async function issueSessionTokens(req: Request, res: any, user: { id: string; name: string; mobile: string; role: 'DRIVER' | 'SHIPPER' | 'ADMIN' }): Promise<SessionTokenResult> {
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

  setRefreshCookie(req, res, refreshToken);
  return wantsCookieOnlyTransport(req) ? { token, sessionId } : { token, refreshToken, sessionId };
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

  const user = await resolveVerifiedUser(body);

  await prisma.otpRequest.update({ where: { id: record.id }, data: { attempts: 0, verifiedCount: 0, blockedUntil: null } });
  const session = await issueSessionTokens(req, res, user as { id: string; name: string; mobile: string; role: 'DRIVER' | 'SHIPPER' | 'ADMIN' });

  return res.json({
    user: {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
      name: user.name,
      token: session.token,
      ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    },
  });
}));

router.post('/refresh-token', validateBody(refreshSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof refreshSchema>;
  const incomingRefreshToken = getRefreshTokenFromRequest(req, body.refreshToken);
  if (!incomingRefreshToken) {
    throw new AppError(401, 'Refresh token is missing', 'MISSING_REFRESH_TOKEN');
  }

  const payload = verifyRefreshToken(incomingRefreshToken);
  const tokenHash = hashToken(incomingRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  const session = await prisma.userSession.findUnique({ where: { sessionId: payload.sessionId } });

  if (!storedToken || !session) {
    clearRefreshCookie(req, res);
    throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.status !== 'ACTIVE' || storedToken.expiresAt < new Date() || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
    clearRefreshCookie(req, res);
    throw new AppError(401, 'Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
  }

  if (storedToken.sessionId !== payload.sessionId || session.refreshTokenHash !== tokenHash) {
    await prisma.$transaction([
      prisma.refreshToken.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', lastUsedAt: new Date() } }),
      prisma.userSession.updateMany({ where: { sessionId: payload.sessionId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } }),
    ]);
    clearRefreshCookie(req, res);
    throw new AppError(401, 'Refresh token reuse detected. Session revoked.', 'REFRESH_TOKEN_REUSE');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.status !== 'ACTIVE') {
    clearRefreshCookie(req, res);
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

  setRefreshCookie(req, res, refreshToken);
  return res.json(wantsCookieOnlyTransport(req) ? { token } : { token, refreshToken });
}));

router.post('/logout', requireAuth, validateBody(logoutSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof logoutSchema>;
  const refreshToken = getRefreshTokenFromRequest(req, body.refreshToken);
  const data: { status: 'REVOKED'; lastUsedAt?: Date } = { status: 'REVOKED' };
  if (refreshToken) data.lastUsedAt = new Date();

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { userId: req.user!.id, sessionId: req.user!.sessionId },
      data: { status: 'REVOKED', revokedAt: new Date(), lastSeenAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, ...(refreshToken ? { tokenHash: hashToken(refreshToken) } : { sessionId: req.user!.sessionId }) },
      data,
    }),
  ]);

  clearRefreshCookie(req, res);
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
  clearRefreshCookie(req, res);
  return res.status(204).send();
}));

router.get('/sessions', requireAuth, asyncHandler(async (req, res) => {
  const sessions = await prisma.userSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { sessionId: true, status: true, ipAddress: true, userAgent: true, lastSeenAt: true, expiresAt: true, createdAt: true },
  });
  return res.json({ items: sessions });
}));

router.post('/sessions/revoke', requireAuth, validateBody(revokeSessionSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof revokeSessionSchema>;
  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { userId: req.user!.id, sessionId: body.sessionId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, sessionId: body.sessionId },
      data: { status: 'REVOKED', lastUsedAt: new Date() },
    }),
  ]);
  return res.status(204).send();
}));

export default router;
