import Redis from 'ioredis';
import logger from '../utils/logger.js';

let client = null;

export const getRedis = () => {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('⚠️  REDIS_URL not set — OTP features will be unavailable');
    return null;
  }
  client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  client.on('error', (e) => logger.error('Redis error:', e.message));
  client.on('connect', () => logger.info('✅ Redis connected'));
  return client;
};
