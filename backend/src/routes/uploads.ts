import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate';
import { createSignedUploadIntent } from '../lib/uploads';
import { AppError } from '../types';
import { assertLoadAccess, assertTripAccess } from '../lib/ownership';

const router = Router();
router.use(requireAuth);

const uploadIntentSchema = z.object({
  folder: z.enum(['rc', 'license', 'pod']),
  mimeType: z.string().min(3).max(120),
  entityId: z.string().min(3).max(80).optional(),
}).superRefine((value, ctx) => {
  if (['rc', 'license', 'pod'].includes(value.folder) && !value.entityId) {
    ctx.addIssue({ code: 'custom', path: ['entityId'], message: 'entityId is required for this upload folder' });
  }
});

async function assertUploadOwnership(user: NonNullable<Express.Request['user']>, folder: 'rc' | 'license' | 'pod', entityId?: string) {
  if (!entityId) return;
  if (folder === 'pod') {
    await assertTripAccess(user, entityId, 'UPLOAD_ENTITY_ACCESS_DENIED');
    return;
  }

  if (folder === 'rc' || folder === 'license') {
    if (user.role !== 'ADMIN' && user.role !== 'DRIVER') {
      throw new AppError(403, `Only drivers or admins can upload ${folder.toUpperCase()} documents`, 'UPLOAD_ROLE_NOT_ALLOWED');
    }
    if (user.role === 'DRIVER' && entityId !== user.id) {
      throw new AppError(403, `Drivers can upload ${folder.toUpperCase()} documents only for their own profile`, 'UPLOAD_ENTITY_ACCESS_DENIED');
    }
    return;
  }
}

router.post('/intent', validateBody(uploadIntentSchema), asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof uploadIntentSchema>;
  await assertUploadOwnership(req.user!, body.folder, body.entityId);
  const upload = createSignedUploadIntent({ folder: body.folder, mimeType: body.mimeType, entityId: body.entityId, userId: req.user!.id });
  return res.status(201).json({ upload, security: { directUploadOnly: true, expiresInMinutes: 15, maxSizeBytes: upload.maxSizeBytes } });
}));

export default router;
