import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../types';

export function requireRole(...roles: UserRole[]) {
  return function roleGuard(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden for this role' });
    }
    return next();
  };
}
