import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';

const OTP_TTL      = 5 * 60;        // 5 minutes
const MAX_ATTEMPTS = 3;

const generate = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (phone) => {
  const redis = getRedis();
  const otp = generate();
  const key = `otp:${phone}`;
  const attKey = `otp_att:${phone}`;

  if (redis) {
    await redis.setex(key, OTP_TTL, otp);
    await redis.setex(attKey, OTP_TTL, '0');
  }

  // Send via Twilio if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your APTrucking OTP is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      logger.info(`OTP sent to ${phone}`);
    } catch (e) {
      logger.error('Twilio SMS failed:', e.message);
      throw new Error('Failed to send OTP via SMS');
    }
  } else {
    // Dev mode — log OTP
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);
  }

  return { sent: true };
};

export const verifyOTP = async (phone, otp) => {
  const redis = getRedis();
  const key    = `otp:${phone}`;
  const attKey = `otp_att:${phone}`;

  if (!redis) {
    // No Redis — allow bypass in dev with OTP "123456"
    if (process.env.NODE_ENV !== 'production' && otp === '123456') return true;
    throw new Error('OTP service unavailable');
  }

  const attempts = parseInt(await redis.get(attKey) || '0');
  if (attempts >= MAX_ATTEMPTS) throw new Error('Too many OTP attempts. Request a new OTP.');

  const stored = await redis.get(key);
  if (!stored) throw new Error('OTP expired. Request a new one.');

  if (stored !== otp) {
    await redis.incr(attKey);
    throw new Error('Invalid OTP');
  }

  await redis.del(key);
  await redis.del(attKey);
  return true;
};
