import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types';
import { captureException } from '../lib/sentry';
import { logger } from '../lib/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten(),
      requestId: req.requestId,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      details: err.details,
      requestId: req.requestId,
    });
  }

  captureException(err);
  logger.error(
    { err: err instanceof Error ? err.message : String(err), path: req.originalUrl, requestId: req.requestId },
    'Unhandled request error'
  );
  return res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    requestId: req.requestId,
  });
}
