import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { AppError } from '../types';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { enqueueJob } from '../lib/jobs';
import { delCache } from '../lib/cache';

const router = Router();
router.use(requireAuth);

const requestSettlementSchema = z.object({ amountInPaise: z.coerce.number().int().positive().min(1000), bankAccountId: z.string().cuid() });
const settlementIdParam = z.object({ id: z.string().cuid() });
const statusSchema = z.object({ status: z.enum(['APPROVED', 'PAID', 'REJECTED']), reference: z.string().trim().max(120).optional() });

async function getWalletBalance(userId: string) {
  const entries = await prisma.walletLedger.findMany({ where: { userId } });
  return entries.reduce((sum: number, item: { direction: 'CREDIT' | 'DEBIT'; amountInPaise: number }) => sum + (item.direction === 'CREDIT' ? item.amountInPaise : -item.amountInPaise), 0);
}

async function getReservedSettlementAmount(userId: string) {
  const items = await prisma.settlement.findMany({ where: { userId, status: { in: ['REQUESTED', 'APPROVED'] } } });
  return items.reduce((sum: number, item: { amountInPaise: number }) => sum + item.amountInPaise, 0);
}

router.post('/request', requireRole('DRIVER', 'ADMIN'), validateBody(requestSettlementSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof requestSettlementSchema>;
  const bankAccount = await prisma.bankAccount.findFirst({ where: { id: body.bankAccountId, userId: req.user!.id } });
  if (!bankAccount) throw new AppError(404, 'Bank account not found', 'BANK_ACCOUNT_NOT_FOUND');
  if (!bankAccount.isVerified) throw new AppError(409, 'Bank account must be verified before payout', 'BANK_ACCOUNT_NOT_VERIFIED');

  const [walletBalance, reservedAmount, pendingDuplicate] = await Promise.all([
    getWalletBalance(req.user!.id),
    getReservedSettlementAmount(req.user!.id),
    prisma.settlement.findFirst({ where: { userId: req.user!.id, bankAccountId: body.bankAccountId, amountInPaise: body.amountInPaise, status: { in: ['REQUESTED', 'APPROVED'] } } }),
  ]);
  if (pendingDuplicate) throw new AppError(409, 'Duplicate settlement request already exists', 'SETTLEMENT_DUPLICATE_REQUEST');

  const availableBalance = walletBalance - reservedAmount;
  if (availableBalance < body.amountInPaise) {
    throw new AppError(409, 'Insufficient wallet balance for settlement request', 'SETTLEMENT_INSUFFICIENT_BALANCE', { walletBalance, reservedAmount, availableBalance });
  }

  const item = await prisma.settlement.create({
    data: { userId: req.user!.id, bankAccountId: body.bankAccountId, amountInPaise: body.amountInPaise, status: 'REQUESTED' },
  });
  await enqueueJob('settlement.requested', { settlementId: item.id }, { userId: req.user!.id });
  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.status(201).json({ item, availableBalanceAfterRequest: availableBalance - body.amountInPaise });
}));

router.get('/', asyncHandler(async (req, res) => {
  const items = await prisma.settlement.findMany({
    where: req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json({ items });
}));

router.patch('/:id/status', requireRole('ADMIN'), validateParams(settlementIdParam), validateBody(statusSchema), asyncHandler(async (req, res) => {
  const params = req.params as z.infer<typeof settlementIdParam>;
  const body = req.body as z.infer<typeof statusSchema>;
  const current = await prisma.settlement.findUnique({ where: { id: params.id } });
  if (!current) throw new AppError(404, 'Settlement not found', 'SETTLEMENT_NOT_FOUND');
  if (current.status === 'PAID') throw new AppError(409, 'Settlement is already marked as PAID', 'SETTLEMENT_ALREADY_PAID');
  if (body.status === 'PAID' && current.status !== 'APPROVED') throw new AppError(409, 'Only approved settlements can be marked as paid', 'SETTLEMENT_APPROVAL_REQUIRED');
  if (body.status === 'APPROVED' && current.status !== 'REQUESTED') throw new AppError(409, 'Only requested settlements can be approved', 'SETTLEMENT_INVALID_TRANSITION');
  if (body.status === 'REJECTED' && !['REQUESTED', 'APPROVED'].includes(current.status)) throw new AppError(409, 'Settlement cannot be rejected from its current state', 'SETTLEMENT_INVALID_TRANSITION');
  if (body.status === 'PAID' && !body.reference?.trim()) throw new AppError(400, 'Reference is required when marking settlement as PAID', 'SETTLEMENT_REFERENCE_REQUIRED');

  const existingLedger = await prisma.walletLedger.findFirst({ where: { referenceId: current.id, category: 'SETTLEMENT_PAID' } });
  if (body.status === 'PAID' && existingLedger) throw new AppError(409, 'Settlement payout already debited from wallet', 'SETTLEMENT_ALREADY_DEBITED');

  const item = await prisma.$transaction(async (tx) => {
    const updatedSettlement = await tx.settlement.update({ where: { id: params.id }, data: { status: body.status, reference: body.reference?.trim() || null } });

    if (body.status === 'PAID') {
      await tx.walletLedger.create({
        data: {
          userId: current.userId,
          direction: 'DEBIT',
          amountInPaise: current.amountInPaise,
          category: 'SETTLEMENT_PAID',
          referenceId: current.id,
          referenceType: 'settlement',
          notes: body.reference?.trim() || 'Settlement paid',
        },
      });
    }

    return updatedSettlement;
  });
  await enqueueJob('settlement.status.updated', { settlementId: item.id, status: item.status }, { userId: current.userId });
  await delCache('dashboard:summary:admin');
  await delCache('dashboard:overview:admin');
  return res.json({ item });
}));

export default router;
