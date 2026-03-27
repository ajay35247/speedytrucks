"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const asyncHandler_1 = require("../middleware/asyncHandler");
const cache_1 = require("../lib/cache");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/summary', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.user?.role === 'ADMIN') {
        const cacheKey = 'dashboard:summary:admin';
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached)
            return res.json(cached);
        const [users, openLoads, activeTrips, pendingSettlements, highRiskSignals, paymentsCaptured] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.load.count({ where: { status: 'OPEN' } }),
            prisma_1.prisma.trip.count({ where: { currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
            prisma_1.prisma.settlement.count({ where: { status: 'REQUESTED' } }),
            prisma_1.prisma.fraudSignal.count({ where: { severity: 'HIGH' } }),
            prisma_1.prisma.paymentOrder.count({ where: { status: 'CAPTURED' } }),
        ]);
        const payload = { metrics: { users, openLoads, activeTrips, pendingSettlements, highRiskSignals, paymentsCaptured } };
        await (0, cache_1.setCache)(cacheKey, payload, 30);
        return res.json(payload);
    }
    if (req.user?.role === 'SHIPPER') {
        const [myLoads, liveTrips, myPayments] = await Promise.all([
            prisma_1.prisma.load.count({ where: { shipperUserId: req.user.id } }),
            prisma_1.prisma.trip.count({ where: { load: { shipperUserId: req.user.id }, currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
            prisma_1.prisma.paymentOrder.count({ where: { createdByUserId: req.user.id, status: 'CAPTURED' } }),
        ]);
        return res.json({ metrics: { myLoads, liveTrips, myPayments } });
    }
    const [openLoads, myTrips, mySettlements] = await Promise.all([
        prisma_1.prisma.load.count({ where: { status: 'OPEN' } }),
        prisma_1.prisma.trip.count({ where: { driverUserId: req.user.id, currentStatus: { in: ['ASSIGNED', 'AT_PICKUP', 'IN_TRANSIT'] } } }),
        prisma_1.prisma.settlement.count({ where: { userId: req.user.id } }),
    ]);
    return res.json({ metrics: { openLoads, myTrips, mySettlements } });
}));
router.get('/admin/overview', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.user?.role !== 'ADMIN')
        return res.status(403).json({ message: 'Forbidden' });
    const cacheKey = 'dashboard:overview:admin';
    const cached = await (0, cache_1.getCache)(cacheKey);
    if (cached)
        return res.json(cached);
    const [users, trips, loads, payments, settlements, fraudSignals] = await Promise.all([
        prisma_1.prisma.user.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
        prisma_1.prisma.trip.findMany({ take: 20, orderBy: { updatedAt: 'desc' }, include: { load: true, driver: true } }),
        prisma_1.prisma.load.findMany({ take: 20, orderBy: { updatedAt: 'desc' }, include: { shipper: true } }),
        prisma_1.prisma.paymentOrder.findMany({ take: 20, orderBy: { updatedAt: 'desc' } }),
        prisma_1.prisma.settlement.findMany({ take: 20, orderBy: { updatedAt: 'desc' } }),
        prisma_1.prisma.fraudSignal.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
    ]);
    const payload = { users, trips, loads, payments, settlements, fraudSignals };
    await (0, cache_1.setCache)(cacheKey, payload, 20);
    return res.json(payload);
}));
exports.default = router;
