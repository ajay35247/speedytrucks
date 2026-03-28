import type { NextFunction, Request, Response } from 'express';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateParams<T extends ZodObject<ZodRawShape>>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
}

export function validateQuery<T extends ZodObject<ZodRawShape>>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as typeof req.query;
    next();
  };
}
