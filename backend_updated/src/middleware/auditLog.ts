import type { NextFunction, Request, Response } from 'express';

export function auditLog(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  res.on('finish', () => {
    const body = ['password', 'otp', 'token', 'refreshToken'].reduce<Record<string, unknown>>((acc, key) => {
      if (req.body && typeof req.body === 'object' && key in req.body) {
        acc[key] = '[REDACTED]';
      }
      return acc;
    }, {});
    console.info(
      JSON.stringify({
        type: 'audit',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        userId: req.user?.id,
        role: req.user?.role,
        ip: req.ip,
        redactions: body,
      })
    );
  });
  next();
}
