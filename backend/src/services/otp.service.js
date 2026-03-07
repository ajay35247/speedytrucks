const logger = require("../utils/logger");
const { getRedis } = require("../config/redis");

const OTP_TTL = 5 * 60;
const MAX_ATTEMPTS = 3;
const otpStore = new Map(); // fallback in-memory store when Redis unavailable

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (phone, purpose = "login") => {
  const otp = generateOTP();
  const key = `otp:${purpose}:${phone}`;
  const redis = getRedis();

  if (redis) {
    await redis.setex(key, OTP_TTL, otp);
    await redis.setex(`otp:attempts:${phone}`, OTP_TTL, "0");
  } else {
    otpStore.set(key, { otp, attempts: 0, expires: Date.now() + OTP_TTL * 1000 });
  }

  // Log OTP in dev, send via Twilio in production if configured
  if (process.env.NODE_ENV === "production" && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require("twilio");
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `[SpeedyTrucks] Your OTP is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    } catch (err) {
      logger.warn(`Twilio SMS failed: ${err.message}`);
    }
  } else {
    logger.info(`[DEV] OTP for ${phone} (${purpose}): ${otp}`);
  }
  return true;
};

const verifyOTP = async (phone, inputOTP, purpose = "login") => {
  const key = `otp:${purpose}:${phone}`;
  const redis = getRedis();

  if (redis) {
    const attempts = parseInt(await redis.get(`otp:attempts:${phone}`) || "0");
    if (attempts >= MAX_ATTEMPTS) return { valid: false, reason: "MAX_ATTEMPTS", message: "Too many attempts." };
    const stored = await redis.get(key);
    if (!stored) return { valid: false, reason: "EXPIRED", message: "OTP expired." };
    if (stored !== inputOTP) {
      await redis.incr(`otp:attempts:${phone}`);
      return { valid: false, reason: "INVALID", message: `Incorrect OTP. ${MAX_ATTEMPTS - attempts - 1} attempts left.` };
    }
    await redis.del(key);
    return { valid: true };
  } else {
    const entry = otpStore.get(key);
    if (!entry || Date.now() > entry.expires) return { valid: false, reason: "EXPIRED", message: "OTP expired." };
    if (entry.attempts >= MAX_ATTEMPTS) return { valid: false, reason: "MAX_ATTEMPTS", message: "Too many attempts." };
    if (entry.otp !== inputOTP) {
      entry.attempts++;
      return { valid: false, reason: "INVALID", message: "Incorrect OTP." };
    }
    otpStore.delete(key);
    return { valid: true };
  }
};

module.exports = { sendOTP, verifyOTP };
