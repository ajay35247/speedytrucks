import { createClient } from 'redis';
import { env } from '../config/env';
import { logger } from './logger';

const redis = createClient({ url: env.redisUrl });
let redisReadyPromise: Promise<void> | null = null;

redis.on('error', (error) => {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Redis connection error');
  redisReadyPromise = null;
});

redis.on('end', () => {
  redisReadyPromise = null;
});

export function ensureRedisConnected() {
  if (redis.isOpen) return Promise.resolve();
  if (!redisReadyPromise) {
    redisReadyPromise = redis.connect().then(() => undefined);
  }
  return redisReadyPromise;
}

export { redis };
