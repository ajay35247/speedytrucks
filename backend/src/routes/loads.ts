import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate';

const router = Router();
const createLoadSchema = z.object({
  pickupAddress: z.string().trim().min(5).max(250),
  dropAddress: z.string().trim().min(5).max(250),
  pickupCity: z.string().trim().min(2).max(80),
  dropCity: z.string().trim().min(2).max(80),
  materialType: z.string().trim().min(2).max(80),
  weightTons: z.coerce.number().positive().max(80),
  quotedPrice: z.coerce.number().positive().max(5000000),
  scheduledPickupAt: z.string().datetime().optional(),
});
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const where =
    req.user?.role === 'SHIPPER'
      ? { shipperUserId: req.user.id }
      : req.user?.role === 'DRIVER'
        ? { status: { in: ['OPEN', 'ASSIGNED', 'IN_TRANSIT'] as const } }
        : {};

  const items = await prisma.load.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { shipper: { select: { id: true, name: true, mobile: true } } },
    take: 100,
  });

  return res.json({ items });
}));

router.post('/', requireRole('SHIPPER', 'ADMIN'), validateBody(createLoadSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof createLoadSchema>;
  const load = await prisma.load.create({
    data: {
      shipperUserId: req.user!.id,
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

export default router;
