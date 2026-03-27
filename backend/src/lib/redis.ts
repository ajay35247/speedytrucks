import { createClient } from 'redis';
import { env } from '../config/env';

const redis = createClient({ url: env.redisUrl });
let redisReadyPromise: Promise<void> | null = null;

redis.on('error', (error) => {
  // Keep process alive and surface connectivity issues in logs.
  console.error('[redis]', error);
});

export function ensureRedisConnected() {
  if (!redisReadyPromise) {
    redisReadyPromise = redis.connect().then(() => undefined);
  }
  return redisReadyPromise;
}

export { redis };
