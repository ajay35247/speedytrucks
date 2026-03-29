import 'dotenv/config';
import { z } from 'zod';

const required = (key: string, fallbackKeys: string[] = []) => {
  const keys = [key, ...fallbackKeys];
  for (const currentKey of keys) {
    const value = process.env[currentKey];
    if (value && value.trim()) return value.trim();
  }
  throw new Error(`${key} is required`);
};

const optionalSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  OTP_MAX_SEND_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(8),
  OTP_BLOCK_MINUTES: z.coerce.number().int().positive().default(30),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  MOBILE_APP_URL_SCHEME: z.string().default('aptrucking://'),
  SENTRY_DSN: z.string().optional(),
  UPLOAD_STORAGE_MODE: z.enum(['disabled', 's3', 'cloudinary']).default('disabled'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('ap-south-1'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  TRUST_PROXY: z.string().default('1'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(10 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  OTP_SEND_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),
  OTP_VERIFY_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),
  PAYMENT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  PAYMENT_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
  SOCKET_CORS_ORIGIN: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

const parsed = optionalSchema.parse(process.env);
const isProduction = parsed.NODE_ENV === 'production';
const normalizedCorsOrigin = parsed.CORS_ORIGIN.trim();
const normalizedSocketCorsOrigin = (parsed.SOCKET_CORS_ORIGIN || normalizedCorsOrigin).trim();

if (isProduction && normalizedCorsOrigin === '*') {
  throw new Error('CORS_ORIGIN cannot be * in production');
}

if (parsed.UPLOAD_STORAGE_MODE === 's3' && (!parsed.S3_BUCKET || !parsed.AWS_ACCESS_KEY_ID || !parsed.AWS_SECRET_ACCESS_KEY)) {
  throw new Error('S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are required when UPLOAD_STORAGE_MODE=s3');
}

if (parsed.UPLOAD_STORAGE_MODE === 'cloudinary' && (!parsed.CLOUDINARY_CLOUD_NAME || !parsed.CLOUDINARY_API_KEY || !parsed.CLOUDINARY_API_SECRET)) {
  throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required when UPLOAD_STORAGE_MODE=cloudinary');
}

export const env = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  isProduction,
  corsOrigin: normalizedCorsOrigin,
  socketCorsOrigin: normalizedSocketCorsOrigin,
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', ['JWT_SECRET']),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', ['JWT_SECRET']),
  jwtAccessTtl: parsed.JWT_ACCESS_TTL,
  jwtRefreshTtl: parsed.JWT_REFRESH_TTL,
  otpMaxSendAttempts: parsed.OTP_MAX_SEND_ATTEMPTS,
  otpMaxVerifyAttempts: parsed.OTP_MAX_VERIFY_ATTEMPTS,
  otpBlockMinutes: parsed.OTP_BLOCK_MINUTES,
  twilioAccountSid: required('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: required('TWILIO_AUTH_TOKEN'),
  twilioVerifySid: required('TWILIO_VERIFY_SERVICE_SID', ['TWILIO_VERIFY_SID']),
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
  rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: parsed.RATE_LIMIT_MAX_REQUESTS,
  authRateLimitWindowMs: parsed.AUTH_RATE_LIMIT_WINDOW_MS,
  authRateLimitMaxRequests: parsed.AUTH_RATE_LIMIT_MAX_REQUESTS,
  otpSendRateLimitMaxRequests: parsed.OTP_SEND_RATE_LIMIT_MAX_REQUESTS,
  otpVerifyRateLimitMaxRequests: parsed.OTP_VERIFY_RATE_LIMIT_MAX_REQUESTS,
  paymentRateLimitWindowMs: parsed.PAYMENT_RATE_LIMIT_WINDOW_MS,
  paymentRateLimitMaxRequests: parsed.PAYMENT_RATE_LIMIT_MAX_REQUESTS,
  cloudinaryApiKey: parsed.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsed.CLOUDINARY_API_SECRET,
  awsAccessKeyId: parsed.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
};
