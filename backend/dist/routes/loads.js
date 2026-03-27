"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const createLoadSchema = zod_1.z.object({
    pickupAddress: zod_1.z.string().trim().min(5).max(250),
    dropAddress: zod_1.z.string().trim().min(5).max(250),
    pickupCity: zod_1.z.string().trim().min(2).max(80),
    dropCity: zod_1.z.string().trim().min(2).max(80),
    materialType: zod_1.z.string().trim().min(2).max(80),
    weightTons: zod_1.z.coerce.number().positive().max(80),
    quotedPrice: zod_1.z.coerce.number().positive().max(5000000),
    scheduledPickupAt: zod_1.z.string().datetime().optional(),
});
router.use(auth_1.requireAuth);
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = req.user?.role === 'SHIPPER'
        ? { shipperUserId: req.user.id }
        : req.user?.role === 'DRIVER'
            ? { status: { in: ['OPEN', 'ASSIGNED', 'IN_TRANSIT'] } }
            : {};
    const items = await prisma_1.prisma.load.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { shipper: { select: { id: true, name: true, mobile: true } } },
        take: 100,
    });
    return res.json({ items });
}));
router.post('/', (0, roles_1.requireRole)('SHIPPER', 'ADMIN'), (0, validate_1.validateBody)(createLoadSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const load = await prisma_1.prisma.load.create({
        data: {
            shipperUserId: req.user.id,
            pickupAddress: body.pickupAddress,
            dropAddress: body.dropAddress,
            pickupCity: body.pickupCity,
            dropCity: body.dropCity,
            materialType: body.materialType,
            weightTons: body.weightTons,
            quotedPrice: body.quotedPrice,
            scheduledPickupAt: body.scheduledPickupAt ? new Date(body.scheduledPickupAt) : undefined,
            status: 'OPEN',
        },
    });
    return res.status(201).json({ item: load });
}));
exports.default = router;
