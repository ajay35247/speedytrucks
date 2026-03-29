import { ensureRedisConnected, redis } from './redis';

export async function getCache<T>(key: string): Promise<T | null> {
  await ensureRedisConnected();
  const value = await redis.get(key);
  return value ? (JSON.parse(value) as T) : null;
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  await ensureRedisConnected();
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function delCache(key: string): Promise<void> {
  await ensureRedisConnected();
  await redis.del(key);
}
