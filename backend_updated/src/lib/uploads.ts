import crypto from 'node:crypto';
import { env } from '../config/env';
import { AppError } from '../types';

export type UploadFolder = 'rc' | 'license' | 'pod';

function sanitizeEntityId(value?: string) {
  return String(value || crypto.randomUUID()).replace(/[^a-zA-Z0-9/_-]/g, '-').slice(0, 80);
}

function buildObjectKey(params: { folder: UploadFolder; userId: string; entityId?: string; mimeType: string }) {
  const extension = params.mimeType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'bin';
  const datePrefix = new Date().toISOString().slice(0, 10);
  return `${params.folder}/${params.userId}/${datePrefix}/${sanitizeEntityId(params.entityId)}.${extension}`;
}

function hmacSha256(key: string | Buffer, value: string) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: string | Buffer, value: string) {
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

function sha1Hex(value: string) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function createCloudinaryIntent(params: { folder: UploadFolder; mimeType: string; userId: string; entityId?: string }) {
  const publicId = buildObjectKey(params).replace(/\.[a-zA-Z0-9]+$/, '');
  const folder = publicId.split('/').slice(0, -1).join('/');
  const timestamp = Math.floor(Date.now() / 1000);
  const context = `user_id=${params.userId}|entity_id=${sanitizeEntityId(params.entityId)}`;
  const signBase = `context=${context}&folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${env.cloudinaryApiSecret}`;
  return {
    storageMode: 'cloudinary',
    objectKey: `${publicId}.${params.mimeType.split('/')[1] || 'bin'}`,
    mimeType: params.mimeType,
    method: 'POST',
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/auto/upload`,
    maxSizeBytes: 10 * 1024 * 1024,
    expiresAt: new Date((timestamp + 15 * 60) * 1000).toISOString(),
    fields: {
      api_key: env.cloudinaryApiKey,
      timestamp,
      folder,
      public_id: publicId,
      context,
      signature: sha1Hex(signBase),
    },
  };
}

function createS3Intent(params: { folder: UploadFolder; mimeType: string; userId: string; entityId?: string }) {
  const objectKey = buildObjectKey(params);
  const now = new Date();
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = iso.slice(0, 8);
  const region = env.s3Region;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const expiration = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const policy = {
    expiration,
    conditions: [
      { bucket: env.s3Bucket },
      ['eq', '$key', objectKey],
      ['eq', '$Content-Type', params.mimeType],
      ['content-length-range', 1, 10 * 1024 * 1024],
      { 'x-amz-algorithm': 'AWS4-HMAC-SHA256' },
      { 'x-amz-credential': `${env.awsAccessKeyId}/${credentialScope}` },
      { 'x-amz-date': `${iso.slice(0, 15)}Z` },
    ],
  };
  const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');
  const kDate = hmacSha256(`AWS4${env.awsSecretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = hmacHex(kSigning, policyBase64);

  return {
    storageMode: 's3',
    bucket: env.s3Bucket,
    objectKey,
    mimeType: params.mimeType,
    method: 'POST',
    uploadUrl: `https://${env.s3Bucket}.s3.${region}.amazonaws.com/`,
    maxSizeBytes: 10 * 1024 * 1024,
    expiresAt: expiration,
    fields: {
      key: objectKey,
      'Content-Type': params.mimeType,
      Policy: policyBase64,
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${env.awsAccessKeyId}/${credentialScope}`,
      'X-Amz-Date': `${iso.slice(0, 15)}Z`,
      'X-Amz-Signature': signature,
    },
  };
}

export function createSignedUploadIntent(params: { folder: UploadFolder; mimeType: string; userId: string; entityId?: string }) {
  if (env.uploadStorageMode === 'disabled') {
    throw new AppError(503, 'Upload storage is not configured', 'UPLOAD_STORAGE_NOT_CONFIGURED');
  }

  if (!/^(image\/(jpeg|png|webp)|application\/(pdf|octet-stream))$/i.test(params.mimeType)) {
    throw new AppError(400, 'Unsupported upload mime type', 'UPLOAD_MIME_NOT_ALLOWED');
  }

  if (env.uploadStorageMode === 'cloudinary') {
    return createCloudinaryIntent(params);
  }

  if (env.uploadStorageMode === 's3') {
    return createS3Intent(params);
  }

  throw new AppError(500, 'Unsupported upload storage mode', 'UPLOAD_STORAGE_MODE_INVALID');
}
