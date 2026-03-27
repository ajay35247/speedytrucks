import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate';
import { createSignedUploadIntent } from '../lib/uploads';

const router = Router();
router.use(requireAuth);

const uploadIntentSchema = z.object({
  folder: z.enum(['rc', 'license', 'pod']),
  mimeType: z.string().min(3).max(120),
  entityId: z.string().min(3).max(80).optional(),
});

router.post('/intent', validateBody(uploadIntentSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof uploadIntentSchema>;
  const upload = createSignedUploadIntent({ folder: body.folder, mimeType: body.mimeType, entityId: body.entityId, userId: req.user!.id });
  return res.status(201).json({ upload });
}));

export default router;
