import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtUser } from '../types';
import { env } from '../config/env';

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSessionId() {
  return crypto.randomUUID();
}

type SessionSeed = Omit<JwtUser, 'tokenType' | 'sessionId'> & { sessionId?: string };

export function signAccessToken(user: SessionSeed) {
  return jwt.sign(
    {
      ...user,
      sessionId: user.sessionId || createSessionId(),
      tokenType: 'access',
    },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessTtl as SignOptions['expiresIn'] }
  );
}

export function signRefreshToken(user: SessionSeed) {
  return jwt.sign(
    {
      ...user,
      sessionId: user.sessionId || createSessionId(),
      tokenType: 'refresh',
    },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshTtl as SignOptions['expiresIn'] }
  );
}

function verifyWithSecret(token: string, secret: string, tokenType: 'access' | 'refresh'): JwtUser {
  const payload = jwt.verify(token, secret) as JwtUser;
  if (payload.tokenType !== tokenType || !payload.sessionId) {
    throw new Error(`Invalid ${tokenType} token payload`);
  }
  return payload;
}

export function verifyAccessToken(token: string): JwtUser {
  return verifyWithSecret(token, env.jwtAccessSecret, 'access');
}

export function verifyRefreshToken(token: string): JwtUser {
  return verifyWithSecret(token, env.jwtRefreshSecret, 'refresh');
}
