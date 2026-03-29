import { Router } from 'express';
import { z } from 'zod';
import { getRazorpayClient, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from '../lib/razorpay';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimit';
import { requireRole } from '../middleware/roles';
import { AppError } from '../types';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { evaluatePaymentRisk } from '../services/fraud';
import { enqueueJob } from '../lib/jobs';
import { delCache } from '../lib/cache';
import { assertLoadAccess, assertPaymentAccess } from '../lib/ownership';

const router = Router();
router.use(paymentLimiter);

const createOrderSchema = z.object({
  loadId: z.string().cuid().optional(),
  amountInPaise: z.coerce.number().int().positive().max(50_00_00_000),
  receipt: z.string().trim().min(4).max(80),
  notes: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
const verifySchema = z.object({
  razorpayOrderId: z.string().min(10),
  razorpayPaymentId: z.string().min(10),
  razorpaySignature: z.string().min(10),
});
const paymentIdParam = z.object({ id: z.string().cuid() });

router.post('/create-order', requireAuth, requireRole('SHIPPER', 'ADMIN'), validateBody(createOrderSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createOrderSchema>;
  let load = null;
  if (body.loadId) {
    load = await assertLoadAccess(req.user!, body.loadId, 'PAYMENT_LOAD_ACCESS_DENIED');
    if (load.status === 'CANCELLED') throw new AppError(409, 'Cancelled load cannot be paid', 'PAYMENT_LOAD_CANCELLED');
  } else if (req.user!.role === 'SHIPPER') {
    throw new AppError(400, 'Shipper payments require a loadId', 'PAYMENT_LOAD_REQUIRED');
  }

  await evaluatePaymentRisk({ userId: req.user!.id, amountInPaise: body.amountInPaise, loadId: body.loadId });

  const duplicate = body.loadId
    ? await prisma.paymentOrder.findFirst({ where: { loadId: body.loadId, status: { in: ['CREATED', 'AUTHORIZED', 'CAPTURED'] } } })
    : null;
  if (duplicate) throw new AppError(409, 'An active payment already exists for this load', 'PAYMENT_ALREADY_EXISTS');

  const client = getRazorpayClient();
  const order = await client.orders.create({
    amount: body.amountInPaise,
    currency: 'INR',
    receipt: body.receipt,
    notes: body.notes ? Object.fromEntries(Object.entries(body.notes)) : undefined,
  });

  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      loadId: body.loadId,
      createdByUserId: req.user!.id,
      razorpayOrderId: order.id,
      amountInPaise: body.amountInPaise,
      receipt: body.receipt,
      status: 'CREATED',
      notesJson: body.notes ?? undefined,
    },
  });

  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.status(201).json({ order, item: paymentOrder, load });
}));

router.post('/verify', requireAuth, requireRole('SHIPPER', 'ADMIN'), validateBody(verifySchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof verifySchema>;
  const existing = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId: body.razorpayOrderId },
    include: { load: true },
  });
  if (!existing) throw new AppError(404, 'Payment order not found', 'PAYMENT_ORDER_NOT_FOUND');
  await assertPaymentAccess(req.user!, existing.id);
  if (['AUTHORIZED', 'CAPTURED'].includes(existing.status)) {
    return res.json({ success: true, item: existing });
  }

  const isValid = verifyRazorpayPaymentSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature);
  if (!isValid) throw new AppError(400, 'Invalid payment signature', 'INVALID_PAYMENT_SIGNATURE');

  const payment = await prisma.paymentOrder.update({
    where: { razorpayOrderId: body.razorpayOrderId },
    data: { razorpayPaymentId: body.razorpayPaymentId, status: 'AUTHORIZED' },
  });

  await enqueueJob('payment.settlement.review', { paymentOrderId: payment.id, amountInPaise: payment.amountInPaise }, { userId: req.user!.id });
  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.json({ success: true, item: payment });
}));

router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = String(req.header('x-razorpay-signature') || '');
  const payload = req.rawBody || JSON.stringify(req.body || {});
  if (!signature || !verifyRazorpayWebhookSignature(payload, signature)) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const event = req.body as { event?: string; payload?: { payment?: { entity?: { order_id?: string; id?: string } } } };
  const orderId = event.payload?.payment?.entity?.order_id;
  const paymentId = event.payload?.payment?.entity?.id;
  const paymentOrder = orderId ? await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: orderId } }) : null;

  const existingWebhook = paymentId
    ? await prisma.paymentWebhookEvent.findFirst({ where: { razorpayOrderId: orderId, eventName: event.event || 'unknown', signature } })
    : null;
  if (!existingWebhook) {
    await prisma.paymentWebhookEvent.create({
      data: {
        paymentOrderId: paymentOrder?.id,
        razorpayOrderId: orderId,
        eventName: event.event || 'unknown',
        payloadJson: req.body,
        signature,
        processedAt: new Date(),
      },
    });
  }

  if (orderId && event.event) {
    const nextStatus = event.event === 'payment.captured' ? 'CAPTURED' : event.event === 'payment.failed' ? 'FAILED' : null;
    if (nextStatus) {
      await prisma.paymentOrder.updateMany({ where: { razorpayOrderId: orderId }, data: { status: nextStatus, razorpayPaymentId: paymentId } });
      if (nextStatus === 'CAPTURED' && paymentOrder) {
        const existingCaptureJob = await prisma.appJob.findFirst({
          where: {
            name: 'payment.settlement.capture',
            payloadJson: { path: ['paymentOrderId'], equals: paymentOrder.id },
            status: { in: ['QUEUED', 'PROCESSING', 'PROCESSED'] },
          },
        });
        if (!existingCaptureJob) {
          await enqueueJob('payment.settlement.capture', { paymentOrderId: paymentOrder.id, razorpayOrderId: orderId, razorpayPaymentId: paymentId }, { userId: paymentOrder.createdByUserId });
        }
      }
      if (nextStatus === 'FAILED' && paymentOrder) {
        await enqueueJob('payment.failed.audit', { paymentOrderId: paymentOrder.id, razorpayOrderId: orderId, razorpayPaymentId: paymentId }, { userId: paymentOrder.createdByUserId });
      }
    }
  }

  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.json({ received: true });
}));

router.get('/', requireAuth, requireRole('ADMIN', 'SHIPPER'), asyncHandler(async (req, res) => {
  const items = await prisma.paymentOrder.findMany({
    where: req.user!.role === 'SHIPPER' ? { OR: [{ createdByUserId: req.user!.id }, { load: { shipperUserId: req.user!.id } }] } : {},
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true, mobile: true } }, load: true },
    take: 100,
  });
  return res.json({ items });
}));

router.get('/:id', requireAuth, requireRole('ADMIN', 'SHIPPER'), validateParams(paymentIdParam), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof paymentIdParam>;
  const item = await assertPaymentAccess(req.user!, params.id);
  return res.json({ item });
}));

router.get('/wallet', requireAuth, asyncHandler(async (req, res) => {
  const items = await prisma.walletLedger.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const balanceInPaise = items.reduce((sum: number, item: { direction: 'CREDIT' | 'DEBIT'; amountInPaise: number }) => sum + (item.direction === 'CREDIT' ? item.amountInPaise : -item.amountInPaise), 0);
  return res.json({ balanceInPaise, items });
}));

export default router;
