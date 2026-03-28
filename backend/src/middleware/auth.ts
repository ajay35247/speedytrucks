import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token', code: 'MISSING_BEARER_TOKEN' });
  }

  try {
    const token = authorization.slice(7);
    const decoded = verifyAccessToken(token);
    const [user, session] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.id } }),
      prisma.userSession.findUnique({ where: { sessionId: decoded.sessionId } }),
    ]);

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'User is inactive or not found', code: 'AUTH_USER_INVALID' });
    }

    if (!session || session.userId !== user.id || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Session is no longer valid', code: 'SESSION_INVALID' });
    }

    await prisma.userSession.update({ where: { sessionId: session.sessionId }, data: { lastSeenAt: new Date() } });
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_ACCESS_TOKEN' });
  }
}
