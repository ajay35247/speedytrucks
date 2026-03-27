"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const types_1 = require("../types");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const jobs_1 = require("../lib/jobs");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const requestSettlementSchema = zod_1.z.object({ amountInPaise: zod_1.z.coerce.number().int().positive(), bankAccountId: zod_1.z.string().cuid() });
const settlementIdParam = zod_1.z.object({ id: zod_1.z.string().cuid() });
const statusSchema = zod_1.z.object({ status: zod_1.z.enum(['APPROVED', 'PAID', 'REJECTED']), reference: zod_1.z.string().max(120).optional() });
router.post('/request', (0, roles_1.requireRole)('DRIVER', 'ADMIN'), (0, validate_1.validateBody)(requestSettlementSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const bankAccount = await prisma_1.prisma.bankAccount.findFirst({ where: { id: body.bankAccountId, userId: req.user.id } });
    if (!bankAccount)
        throw new types_1.AppError(404, 'Bank account not found', 'BANK_ACCOUNT_NOT_FOUND');
    const item = await prisma_1.prisma.settlement.create({
        data: { userId: req.user.id, bankAccountId: body.bankAccountId, amountInPaise: body.amountInPaise, status: 'REQUESTED' },
    });
    await (0, jobs_1.enqueueJob)('settlement.requested', { settlementId: item.id });
    return res.status(201).json({ item });
}));
router.get('/', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const items = await prisma_1.prisma.settlement.findMany({
        where: req.user.role === 'ADMIN' ? {} : { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return res.json({ items });
}));
router.patch('/:id/status', (0, roles_1.requireRole)('ADMIN'), (0, validate_1.validateParams)(settlementIdParam), (0, validate_1.validateBody)(statusSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const params = req.params;
    const body = req.body;
    const item = await prisma_1.prisma.settlement.update({ where: { id: params.id }, data: { status: body.status, reference: body.reference } });
    await (0, jobs_1.enqueueJob)('settlement.status.updated', { settlementId: item.id, status: item.status });
    return res.json({ item });
}));
exports.default = router;
