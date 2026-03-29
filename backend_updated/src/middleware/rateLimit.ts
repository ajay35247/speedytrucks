import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env';
import { ensureRedisConnected, redis } from '../lib/redis';
import { logger } from '../lib/logger';

// Change:
resetTime?: Date;
// To:
resetTime: Date;
  totalHits: number;
  resetTime: Date;
};

class RedisRateLimitStore {
  windowMs!: number;
  localKeys = true;
  prefix: string;

  constructor(prefix = 'rate-limit') {
    this.prefix = prefix;
  }

  init(options: { windowMs: number }) {
    this.windowMs = options.windowMs;
  }

  private getKey(key: string) {
    return `${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<IncrementResult> {
    try {
      await ensureRedisConnected();
      const namespacedKey = this.getKey(key);
      const totalHits = await redis.incr(namespacedKey);
      let ttlMs = await redis.pTTL(namespacedKey);
      if (ttlMs < 0) {
        await redis.pExpire(namespacedKey, this.windowMs);
        ttlMs = this.windowMs;
      }
      return {
        totalHits,
        resetTime: new Date(Date.now() + ttlMs),
      };
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Redis rate limiter fallback triggered');
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    }
  }

  async decrement(key: string) {
    try {
      await ensureRedisConnected();
      const namespacedKey = this.getKey(key);
      const remaining = await redis.decr(namespacedKey);
      if (remaining <= 0) {
        await redis.del(namespacedKey);
      }
    } catch {
      // noop fallback
    }
  }

  async resetKey(key: string) {
    try {
      await ensureRedisConnected();
      await redis.del(this.getKey(key));
    } catch {
      // noop fallback
    }
  }
}

function keyGenerator(req: Request) {
  return req.user?.id || String(req.header('x-forwarded-for') || req.ip || 'anonymous');
}

function buildLimiter(windowMs: number, limit: number, prefix: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: (req) => req.path === '/health' || req.path === '/healthz' || req.path === '/readyz',
    message: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
    store: new RedisRateLimitStore(prefix),
    handler: (req, res, _next, options) => {
      logger.warn({ path: req.originalUrl, requestId: req.requestId, key: keyGenerator(req) }, 'Rate limit exceeded');
      res.status(options.statusCode).json({
        ...(options.message as Record<string, unknown>),
        requestId: req.requestId,
      });
    },
  });
}

export const apiLimiter = buildLimiter(env.rateLimitWindowMs, env.rateLimitMaxRequests, 'rl:api');
export const authLimiter = buildLimiter(env.authRateLimitWindowMs, env.authRateLimitMaxRequests, 'rl:auth');
export const otpSendLimiter = buildLimiter(env.authRateLimitWindowMs, env.otpSendRateLimitMaxRequests, 'rl:otp-send');
export const otpVerifyLimiter = buildLimiter(env.authRateLimitWindowMs, env.otpVerifyRateLimitMaxRequests, 'rl:otp-verify');
export const paymentLimiter = buildLimiter(env.paymentRateLimitWindowMs, env.paymentRateLimitMaxRequests, 'rl:payment');
