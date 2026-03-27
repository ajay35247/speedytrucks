"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const razorpay_1 = require("../lib/razorpay");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const roles_1 = require("../middleware/roles");
const types_1 = require("../types");
const asyncHandler_1 = require("../middleware/asyncHandler");
const validate_1 = require("../middleware/validate");
const fraud_1 = require("../services/fraud");
const jobs_1 = require("../lib/jobs");
const router = (0, express_1.Router)();
router.use(rateLimit_1.paymentLimiter);
const createOrderSchema = zod_1.z.object({
    loadId: zod_1.z.string().cuid().optional(),
    amountInPaise: zod_1.z.coerce.number().int().positive(),
    receipt: zod_1.z.string().min(4).max(80),
    notes: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).optional(),
});
const verifySchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().min(10),
    razorpayPaymentId: zod_1.z.string().min(10),
    razorpaySignature: zod_1.z.string().min(10),
});
router.post('/create-order', auth_1.requireAuth, (0, roles_1.requireRole)('SHIPPER', 'ADMIN'), (0, validate_1.validateBody)(createOrderSchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    await (0, fraud_1.evaluatePaymentRisk)({ userId: req.user.id, amountInPaise: body.amountInPaise, loadId: body.loadId });
    const client = (0, razorpay_1.getRazorpayClient)();
    const order = await client.orders.create({
        amount: body.amountInPaise,
        currency: 'INR',
        receipt: body.receipt,
        notes: body.notes ? Object.fromEntries(Object.entries(body.notes)) : undefined,
    });
    await prisma_1.prisma.paymentOrder.create({
        data: {
            loadId: body.loadId,
            createdByUserId: req.user.id,
            razorpayOrderId: order.id,
            amountInPaise: body.amountInPaise,
            receipt: body.receipt,
            status: 'CREATED',
            notesJson: body.notes ?? undefined,
        },
    });
    return res.status(201).json({ order });
}));
router.post('/verify', auth_1.requireAuth, (0, roles_1.requireRole)('SHIPPER', 'ADMIN'), (0, validate_1.validateBody)(verifySchema), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const body = req.body;
    const existing = await prisma_1.prisma.paymentOrder.findUnique({
        where: { razorpayOrderId: body.razorpayOrderId },
    });
    if (existing && ['AUTHORIZED', 'CAPTURED'].includes(existing.status)) {
        return res.json({ success: true, item: existing });
    }
    const isValid = (0, razorpay_1.verifyRazorpayPaymentSignature)(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature);
    if (!isValid)
        throw new types_1.AppError(400, 'Invalid payment signature', 'INVALID_PAYMENT_SIGNATURE');
    const payment = await prisma_1.prisma.paymentOrder.update({
        where: { razorpayOrderId: body.razorpayOrderId },
        data: { razorpayPaymentId: body.razorpayPaymentId, status: 'AUTHORIZED' },
    });
    await (0, jobs_1.enqueueJob)('payment.settlement.review', { paymentOrderId: payment.id, amountInPaise: payment.amountInPaise });
    return res.json({ success: true, item: payment });
}));
router.post('/webhook', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const signature = String(req.header('x-razorpay-signature') || '');
    const payload = req.rawBody || JSON.stringify(req.body || {});
    if (!signature || !(0, razorpay_1.verifyRazorpayWebhookSignature)(payload, signature)) {
        return res.status(400).json({ message: 'Invalid webhook signature' });
    }
    const event = req.body;
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    const paymentOrder = orderId ? await prisma_1.prisma.paymentOrder.findUnique({ where: { razorpayOrderId: orderId } }) : null;
    await prisma_1.prisma.paymentWebhookEvent.create({
        data: {
            paymentOrderId: paymentOrder?.id,
            razorpayOrderId: orderId,
            eventName: event.event || 'unknown',
            payloadJson: req.body,
            signature,
            processedAt: new Date(),
        },
    });
    if (orderId && event.event) {
        const nextStatus = event.event === 'payment.captured' ? 'CAPTURED' : event.event === 'payment.failed' ? 'FAILED' : null;
        if (nextStatus) {
            await prisma_1.prisma.paymentOrder.updateMany({ where: { razorpayOrderId: orderId }, data: { status: nextStatus, razorpayPaymentId: paymentId } });
            if (nextStatus === 'CAPTURED' && paymentOrder) {
                const existingCaptureJob = await prisma_1.prisma.appJob.findFirst({
                    where: {
                        name: 'payment.settlement.capture',
                        payloadJson: { path: ['paymentOrderId'], equals: paymentOrder.id },
                        status: { in: ['QUEUED', 'PROCESSING', 'PROCESSED'] },
                    },
                });
                if (!existingCaptureJob) {
                    await (0, jobs_1.enqueueJob)('payment.settlement.capture', { paymentOrderId: paymentOrder.id, razorpayOrderId: orderId, razorpayPaymentId: paymentId });
                }
            }
            if (nextStatus === 'FAILED' && paymentOrder) {
                await (0, jobs_1.enqueueJob)('payment.failed.audit', { paymentOrderId: paymentOrder.id, razorpayOrderId: orderId, razorpayPaymentId: paymentId });
            }
        }
    }
    return res.json({ received: true });
}));
router.get('/', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN', 'SHIPPER'), (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const items = await prisma_1.prisma.paymentOrder.findMany({
        where: req.user.role === 'SHIPPER' ? { createdByUserId: req.user.id } : {},
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true, mobile: true } } },
        take: 100,
    });
    return res.json({ items });
}));
router.get('/wallet', auth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const items = await prisma_1.prisma.walletLedger.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    const balanceInPaise = items.reduce((sum, item) => sum + (item.direction === 'CREDIT' ? item.amountInPaise : -item.amountInPaise), 0);
    return res.json({ balanceInPaise, items });
}));
exports.default = router;
