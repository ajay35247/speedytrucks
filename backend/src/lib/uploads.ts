import crypto from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../types';

export type UploadFolder = 'rc' | 'license' | 'pod';

export function createSignedUploadIntent(params: { folder: UploadFolder; mimeType: string; userId: string; entityId?: string }) {
  if (env.uploadStorageMode === 'disabled') {
    throw new AppError(503, 'Upload storage is not configured', 'UPLOAD_STORAGE_NOT_CONFIGURED');
  }

  const objectKey = [params.folder, params.userId, params.entityId || crypto.randomUUID()].join('/');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    storageMode: env.uploadStorageMode,
    bucket: env.s3Bucket || env.cloudinaryCloudName || 'configure-storage',
    objectKey,
    mimeType: params.mimeType,
    expiresAt,
    method: 'PUT',
    uploadUrl: env.uploadStorageMode === 's3'
      ? `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com/${objectKey}`
      : `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`,
    maxSizeMb: 10,
  };
}
