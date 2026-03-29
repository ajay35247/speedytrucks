import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ensureRedisConnected, redis } from '../lib/redis';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await ensureRedisConnected();
    await redis.ping();
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
