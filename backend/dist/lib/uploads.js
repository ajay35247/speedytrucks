"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignedUploadIntent = createSignedUploadIntent;
const node_crypto_1 = __importDefault(require("node:crypto"));
const env_1 = require("../config/env");
const types_1 = require("../types");
function createSignedUploadIntent(params) {
    if (env_1.env.uploadStorageMode === 'disabled') {
        throw new types_1.AppError(503, 'Upload storage is not configured', 'UPLOAD_STORAGE_NOT_CONFIGURED');
    }
    const objectKey = [params.folder, params.userId, params.entityId || node_crypto_1.default.randomUUID()].join('/');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return {
        storageMode: env_1.env.uploadStorageMode,
        bucket: env_1.env.s3Bucket || env_1.env.cloudinaryCloudName || 'configure-storage',
        objectKey,
        mimeType: params.mimeType,
        expiresAt,
        method: 'PUT',
        uploadUrl: env_1.env.uploadStorageMode === 's3'
            ? `https://${env_1.env.s3Bucket}.s3.${env_1.env.s3Region}.amazonaws.com/${objectKey}`
            : `https://api.cloudinary.com/v1_1/${env_1.env.cloudinaryCloudName}/auto/upload`,
        maxSizeMb: 10,
    };
}
