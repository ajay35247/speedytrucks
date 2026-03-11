import jwt from 'jsonwebtoken';

export const signAccess = (payload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'access_secret_fallback', { expiresIn: '15m' });

export const signRefresh = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback', { expiresIn: '7d' });

export const verifyAccess = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret_fallback');

export const verifyRefresh = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret_fallback');

export const setRefreshCookie = (res, token) =>
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
