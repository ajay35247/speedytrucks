import type { JwtUser } from './types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      requestId?: string;
      rawBody?: string;
    }
  }
}

export {};
