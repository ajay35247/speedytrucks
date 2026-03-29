export type UserRole = 'DRIVER' | 'SHIPPER' | 'ADMIN';

export type JwtUser = {
  id: string;
  mobile: string;
  role: UserRole;
  name: string;
  tokenType: 'access' | 'refresh';
  sessionId: string;
};

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type ApiSuccess<T> = {
  success: true;
  data: T;
  requestId?: string;
};

export type AsyncRoute = import('express').RequestHandler;

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      requestId?: string;
      rawBody?: string;
      io?: import('socket.io').Server;
    }
  }
}
