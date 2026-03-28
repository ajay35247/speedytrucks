import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'authorization',
      'token',
      'refreshToken',
      'refreshTokenHash',
      'password',
      'otp',
      'razorpaySignature',
      'twilioAuthToken',
      'jwtAccessSecret',
      'jwtRefreshSecret',
    ],
    censor: '[REDACTED]',
  },
});
