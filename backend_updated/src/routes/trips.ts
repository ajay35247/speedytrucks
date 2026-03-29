import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { emitTripLocationUpdate } from '../lib/socket';
import { delCache } from '../lib/cache';
import { evaluateTripLocationRisk } from '../services/fraud';
import { AppError } from '../types';
import { assertTripAccess, getTripWithLoadOrThrow } from '../lib/ownership';

const router = Router();
router.use(requireAuth);

const createTripSchema = z.object({
  loadId: z.string().cuid(),
  driverUserId: z.string().cuid(),
  vehicleNumber: z.string().trim().min(6).max(20),
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
const statusUpdateSchema = z.object({
  status: z.enum(['AT_PICKUP', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']),
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
  const [load, driver, existingTrip] = await Promise.all([
    prisma.load.findUnique({ where: { id: body.loadId } }),
    prisma.user.findUnique({ where: { id: body.driverUserId } }),
    prisma.trip.findUnique({ where: { loadId: body.loadId } }),
  ]);

  if (!load) throw new AppError(404, 'Load not found', 'LOAD_NOT_FOUND');
  if (req.user?.role === 'SHIPPER' && load.shipperUserId !== req.user.id) throw new AppError(403, 'Cannot create trip for another shipper load', 'LOAD_ACCESS_DENIED');
  if (!driver || driver.role !== 'DRIVER' || driver.status !== 'ACTIVE') throw new AppError(400, 'Driver is invalid or inactive', 'INVALID_DRIVER');
  if (existingTrip) throw new AppError(409, 'Trip already exists for this load', 'TRIP_ALREADY_EXISTS');
  if (load.status !== 'OPEN') throw new AppError(409, 'Load is not open for assignment', 'LOAD_NOT_OPEN');

  const trip = await prisma.trip.create({
    data: { loadId: body.loadId, driverUserId: body.driverUserId, vehicleNumber: body.vehicleNumber, etaHours: body.etaHours, currentStatus: 'ASSIGNED' },
  });

  await prisma.load.update({ where: { id: body.loadId }, data: { status: 'ASSIGNED' } });
  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.status(201).json({ item: trip });
}));

router.patch('/:id/location', requireRole('DRIVER', 'ADMIN'), validateParams(tripIdParam), validateBody(locationSchema), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof tripIdParam>;
  const body = req.body as z.infer<typeof locationSchema>;

  const existing = await assertTripAccess(req.user!, params.id);

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

  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.json({ item: trip });
}));


router.patch('/:id/status', requireRole('DRIVER', 'ADMIN', 'SHIPPER'), validateParams(tripIdParam), validateBody(statusUpdateSchema), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof tripIdParam>;
  const body = req.body as z.infer<typeof statusUpdateSchema>;
  const trip = await assertTripAccess(req.user!, params.id);

  if (body.status === 'COMPLETED' && trip.currentStatus === 'CANCELLED') {
    throw new AppError(409, 'Cancelled trip cannot be completed', 'TRIP_INVALID_TRANSITION');
  }

  const updated = await prisma.trip.update({
    where: { id: params.id },
    data: {
      currentStatus: body.status,
      startedAt: body.status === 'IN_TRANSIT' ? (trip.startedAt || new Date()) : trip.startedAt,
      endedAt: body.status === 'COMPLETED' ? new Date() : body.status === 'CANCELLED' ? trip.endedAt : trip.endedAt,
      load: {
        update: {
          status: body.status === 'COMPLETED' ? 'DELIVERED' : body.status === 'CANCELLED' ? 'CANCELLED' : 'IN_TRANSIT',
        },
      },
    },
    include: { load: true, driver: { select: { id: true, name: true, mobile: true } } },
  });

  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.json({ item: updated });
}));

router.get('/:id/history', validateParams(tripIdParam), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof tripIdParam>;
  await assertTripAccess(req.user!, params.id);
  const item = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      load: true,
      driver: { select: { id: true, name: true, mobile: true } },
      locationPings: { orderBy: { createdAt: 'desc' }, take: 500 },
      fraudSignals: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });

  return res.json({ item });
}));

export default router;
