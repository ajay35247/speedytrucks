"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const required = (key) => {
    const value = process.env[key];
    if (!value || !value.trim()) {
        throw new Error(`${key} is required`);
    }
    return value.trim();
};
const optionalSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(4000),
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    JWT_ACCESS_TTL: zod_1.z.string().default('15m'),
    JWT_REFRESH_TTL: zod_1.z.string().default('30d'),
    OTP_MAX_SEND_ATTEMPTS: zod_1.z.coerce.number().int().positive().default(5),
    OTP_MAX_VERIFY_ATTEMPTS: zod_1.z.coerce.number().int().positive().default(8),
    OTP_BLOCK_MINUTES: zod_1.z.coerce.number().int().positive().default(30),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    MOBILE_APP_URL_SCHEME: zod_1.z.string().default('aptrucking://'),
    SENTRY_DSN: zod_1.z.string().optional(),
    UPLOAD_STORAGE_MODE: zod_1.z.enum(['disabled', 's3', 'cloudinary']).default('disabled'),
    S3_BUCKET: zod_1.z.string().optional(),
    S3_REGION: zod_1.z.string().default('ap-south-1'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    TRUST_PROXY: zod_1.z.string().default('1'),
});
const parsed = optionalSchema.parse(process.env);
exports.env = {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    corsOrigin: parsed.CORS_ORIGIN,
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    jwtAccessTtl: parsed.JWT_ACCESS_TTL,
    jwtRefreshTtl: parsed.JWT_REFRESH_TTL,
    otpMaxSendAttempts: parsed.OTP_MAX_SEND_ATTEMPTS,
    otpMaxVerifyAttempts: parsed.OTP_MAX_VERIFY_ATTEMPTS,
    otpBlockMinutes: parsed.OTP_BLOCK_MINUTES,
    twilioAccountSid: required('TWILIO_ACCOUNT_SID'),
    twilioAuthToken: required('TWILIO_AUTH_TOKEN'),
    twilioVerifySid: required('TWILIO_VERIFY_SID'),
    razorpayKeyId: required('RAZORPAY_KEY_ID'),
    razorpayKeySecret: required('RAZORPAY_KEY_SECRET'),
    razorpayWebhookSecret: parsed.RAZORPAY_WEBHOOK_SECRET,
    mobileAppUrlScheme: parsed.MOBILE_APP_URL_SCHEME,
    sentryDsn: parsed.SENTRY_DSN,
    uploadStorageMode: parsed.UPLOAD_STORAGE_MODE,
    s3Bucket: parsed.S3_BUCKET,
    s3Region: parsed.S3_REGION,
    cloudinaryCloudName: parsed.CLOUDINARY_CLOUD_NAME,
    redisUrl: required('REDIS_URL'),
    trustProxy: parsed.TRUST_PROXY,
};
