import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { emitTripLocationUpdate } from '../lib/socket';
import { evaluateTripLocationRisk } from '../services/fraud';
import { AppError } from '../types';

const router = Router();
router.use(requireAuth);

const createTripSchema = z.object({
  loadId: z.string().cuid(),
  driverUserId: z.string().cuid(),
  vehicleNumber: z.string().min(6),
  etaHours: z.coerce.number().int().min(0).max(240).optional(),
});
const tripIdParam = z.object({ id: z.string().cuid() });
const locationSchema = z.object({
  currentLat: z.coerce.number().min(-90).max(90),
  currentLng: z.coerce.number().min(-180).max(180),
  speed: z.coerce.number().min(0).max(100).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  accuracyM: z.coerce.number().min(0).max(5000).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const where =
    req.user?.role === 'DRIVER'
      ? { driverUserId: req.user.id }
      : req.user?.role === 'SHIPPER'
        ? { load: { shipperUserId: req.user.id } }
        : {};

  const items = await prisma.trip.findMany({
    where,
    include: { load: true, driver: { select: { id: true, name: true, mobile: true } }, locationPings: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return res.json({ items });
}));

router.post('/', requireRole('ADMIN', 'SHIPPER'), validateBody(createTripSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createTripSchema>;
  const load = await prisma.load.findUnique({ where: { id: body.loadId } });
  if (!load) throw new AppError(404, 'Load not found', 'LOAD_NOT_FOUND');

  const trip = await prisma.trip.create({
    data: { loadId: body.loadId, driverUserId: body.driverUserId, vehicleNumber: body.vehicleNumber, etaHours: body.etaHours, currentStatus: 'ASSIGNED' },
  });

  await prisma.load.update({ where: { id: body.loadId }, data: { status: 'ASSIGNED' } });
  return res.status(201).json({ item: trip });
}));

router.patch('/:id/location', requireRole('DRIVER', 'ADMIN'), validateParams(tripIdParam), validateBody(locationSchema), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof tripIdParam>;
  const body = req.body as z.infer<typeof locationSchema>;

  const existing = await prisma.trip.findUnique({ where: { id: params.id } });
  if (!existing) throw new AppError(404, 'Trip not found', 'TRIP_NOT_FOUND');
  if (req.user?.role === 'DRIVER' && existing.driverUserId !== req.user.id) throw new AppError(403, 'Forbidden', 'TRIP_ACCESS_DENIED');

  const trip = await prisma.trip.update({
    where: { id: params.id },
    data: {
      currentLat: body.currentLat,
      currentLng: body.currentLng,
      currentStatus: 'IN_TRANSIT',
      startedAt: existing.startedAt || new Date(),
      locationPings: {
        create: { lat: body.currentLat, lng: body.currentLng, speed: body.speed, heading: body.heading, accuracyM: body.accuracyM },
      },
    },
    include: { load: true, driver: { select: { id: true, name: true, mobile: true } } },
  });

  await evaluateTripLocationRisk({ tripId: trip.id, driverUserId: trip.driverUserId, lat: body.currentLat, lng: body.currentLng, speed: body.speed, accuracyM: body.accuracyM });
  emitTripLocationUpdate({
    tripId: trip.id,
    driverUserId: trip.driverUserId,
    currentLat: body.currentLat,
    currentLng: body.currentLng,
    speed: body.speed,
    heading: body.heading,
    accuracyM: body.accuracyM,
    timestamp: new Date().toISOString(),
  });

  return res.json({ item: trip });
}));

router.get('/:id/history', validateParams(tripIdParam), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof tripIdParam>;
  const item = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      load: true,
      driver: { select: { id: true, name: true, mobile: true } },
      locationPings: { orderBy: { createdAt: 'desc' }, take: 500 },
      fraudSignals: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });

  if (!item) throw new AppError(404, 'Trip not found', 'TRIP_NOT_FOUND');
  return res.json({ item });
}));

export default router;
