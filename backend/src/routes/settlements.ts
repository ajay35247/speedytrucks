import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { AppError } from '../types';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate';
import { enqueueJob } from '../lib/jobs';

const router = Router();
router.use(requireAuth);

const requestSettlementSchema = z.object({ amountInPaise: z.coerce.number().int().positive(), bankAccountId: z.string().cuid() });
const settlementIdParam = z.object({ id: z.string().cuid() });
const statusSchema = z.object({ status: z.enum(['APPROVED', 'PAID', 'REJECTED']), reference: z.string().max(120).optional() });

router.post('/request', requireRole('DRIVER', 'ADMIN'), validateBody(requestSettlementSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof requestSettlementSchema>;
  const bankAccount = await prisma.bankAccount.findFirst({ where: { id: body.bankAccountId, userId: req.user!.id } });
  if (!bankAccount) throw new AppError(404, 'Bank account not found', 'BANK_ACCOUNT_NOT_FOUND');

  const item = await prisma.settlement.create({
    data: { userId: req.user!.id, bankAccountId: body.bankAccountId, amountInPaise: body.amountInPaise, status: 'REQUESTED' },
  });
  await enqueueJob('settlement.requested', { settlementId: item.id });
  return res.status(201).json({ item });
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
  const item = await prisma.settlement.update({ where: { id: params.id }, data: { status: body.status, reference: body.reference } });
  await enqueueJob('settlement.status.updated', { settlementId: item.id, status: item.status });
  return res.json({ item });
}));

export default router;
