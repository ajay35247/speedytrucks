import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { getCache, setCache } from '../lib/cache';

const router = Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  if (req.user?.role === 'ADMIN') {
    const cacheKey = 'dashboard:summary:admin';
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const [users, openLoads, activeTrips, pendingSettlements, highRiskSignals, paymentsCaptured] = await Promise.all([
      prisma.user.count(),
      prisma.load.count({ where: { status: 'OPEN' } }),
      prisma.trip.count({ where: { currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
      prisma.settlement.count({ where: { status: 'REQUESTED' } }),
      prisma.fraudSignal.count({ where: { severity: 'HIGH' } }),
      prisma.paymentOrder.count({ where: { status: 'CAPTURED' } }),
    ]);
    const payload = { metrics: { users, openLoads, activeTrips, pendingSettlements, highRiskSignals, paymentsCaptured } };
    await setCache(cacheKey, payload, 30);
    return res.json(payload);
  }

  if (req.user?.role === 'SHIPPER') {
    const [myLoads, liveTrips, myPayments] = await Promise.all([
      prisma.load.count({ where: { shipperUserId: req.user.id } }),
      prisma.trip.count({ where: { load: { shipperUserId: req.user.id }, currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
      prisma.paymentOrder.count({ where: { createdByUserId: req.user.id, status: 'CAPTURED' } }),
    ]);
    return res.json({ metrics: { myLoads, liveTrips, myPayments } });
  }

  const [openLoads, myTrips, mySettlements] = await Promise.all([
    prisma.load.count({ where: { status: 'OPEN' } }),
    prisma.trip.count({ where: { driverUserId: req.user!.id, currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
    prisma.settlement.count({ where: { userId: req.user!.id } }),
  ]);

  return res.json({ metrics: { openLoads, myTrips, mySettlements } });
}));

router.get('/admin/overview', asyncHandler(async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const cacheKey = 'dashboard:overview:admin';
  const cached = await getCache(cacheKey);
  if (cached) return res.json(cached);

  const [users, trips, loads, payments, settlements, fraudSignals] = await Promise.all([
    prisma.user.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.trip.findMany({ take: 20, orderBy: { updatedAt: 'desc' }, include: { load: true, driver: true } }),
    prisma.load.findMany({ take: 20, orderBy: { updatedAt: 'desc' }, include: { shipper: true } }),
    prisma.paymentOrder.findMany({ take: 20, orderBy: { updatedAt: 'desc' } }),
    prisma.settlement.findMany({ take: 20, orderBy: { updatedAt: 'desc' } }),
    prisma.fraudSignal.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
  ]);

  const payload = { users, trips, loads, payments, settlements, fraudSignals };
  await setCache(cacheKey, payload, 20);
  return res.json(payload);
}));

export default router;
