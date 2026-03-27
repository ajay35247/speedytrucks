"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const socket_1 = require("../lib/socket");
const fraud_1 = require("../services/fraud");
const types_1 = require("../types");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const createTripSchema = zod_1.z.object({
    loadId: zod_1.z.string().cuid(),
    driverUserId: zod_1.z.string().cuid(),
    vehicleNumber: zod_1.z.string().min(6),
    etaHours: zod_1.z.coerce.number().int().min(0).max(240).optional(),
});
const tripIdParam = zod_1.z.object({ id: zod_1.z.string().cuid() });
const locationSchema = zod_1.z.object({
    currentLat: zod_1.z.coerce.number().min(-90).max(90),
    currentLng: zod_1.z.coerce.number().min(-180).max(180),
    speed: zod_1.z.coerce.number().min(0).max(100).optional(),
    heading: zod_1.z.coerce.number().min(0).max(360).optional(),
    accuracyM: zod_1.z.coerce.number().min(0).max(5000).optional(),
});
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = req.user?.role === 'DRIVER'
        ? { driverUserId: req.user.id }
        : req.user?.role === 'SHIPPER'
            ? { load: { shipperUserId: req.user.id } }
            : {};
    const items = await prisma_1.prisma.trip.findMany({
        where,
        include: { load: true, driver: { select: { id: true, name: true, mobile: true } }, locationPings: { orderBy: { createdAt: 'desc' }, take: 5 } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
    });
    return res.json({ items });
}));
router.post('/', (0, roles_1.requireRole)('ADMIN', 'SHIPPER'), (0, validate_1.validateBody)(createTripSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const load = await prisma_1.prisma.load.findUnique({ where: { id: body.loadId } });
    if (!load)
        throw new types_1.AppError(404, 'Load not found', 'LOAD_NOT_FOUND');
    const trip = await prisma_1.prisma.trip.create({
        data: { loadId: body.loadId, driverUserId: body.driverUserId, vehicleNumber: body.vehicleNumber, etaHours: body.etaHours, currentStatus: 'ASSIGNED' },
    });
    await prisma_1.prisma.load.update({ where: { id: body.loadId }, data: { status: 'ASSIGNED' } });
    return res.status(201).json({ item: trip });
}));
router.patch('/:id/location', (0, roles_1.requireRole)('DRIVER', 'ADMIN'), (0, validate_1.validateParams)(tripIdParam), (0, validate_1.validateBody)(locationSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const params = req.params;
    const body = req.body;
    const existing = await prisma_1.prisma.trip.findUnique({ where: { id: params.id } });
    if (!existing)
        throw new types_1.AppError(404, 'Trip not found', 'TRIP_NOT_FOUND');
    if (req.user?.role === 'DRIVER' && existing.driverUserId !== req.user.id)
        throw new types_1.AppError(403, 'Forbidden', 'TRIP_ACCESS_DENIED');
    const trip = await prisma_1.prisma.trip.update({
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
    await (0, fraud_1.evaluateTripLocationRisk)({ tripId: trip.id, driverUserId: trip.driverUserId, lat: body.currentLat, lng: body.currentLng, speed: body.speed, accuracyM: body.accuracyM });
    (0, socket_1.emitTripLocationUpdate)({
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
router.get('/:id/history', (0, validate_1.validateParams)(tripIdParam), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const params = req.params;
    const item = await prisma_1.prisma.trip.findUnique({
        where: { id: params.id },
        include: {
            load: true,
            driver: { select: { id: true, name: true, mobile: true } },
            locationPings: { orderBy: { createdAt: 'desc' }, take: 500 },
            fraudSignals: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
    });
    if (!item)
        throw new types_1.AppError(404, 'Trip not found', 'TRIP_NOT_FOUND');
    return res.json({ item });
}));
exports.default = router;
