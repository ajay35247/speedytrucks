/**
 * OTP Service — generates, stores (Redis), and verifies OTPs via Twilio SMS
 * 6-digit OTP, 5-minute expiry, max 3 attempts
 */
const twilio = require("twilio");
const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const OTP_TTL = 5 * 60;          // 5 minutes in seconds
const MAX_ATTEMPTS = 3;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * sendOTP — generates a new OTP, stores it in Redis, sends via Twilio
 * @param {string} phone - E.164 format (+919876543210)
 * @param {string} purpose - "login" | "register" | "reset"
 */
const sendOTP = async (phone, purpose = "login") => {
  const redis = getRedis();
  const otp = generateOTP();
  const key = `otp:${purpose}:${phone}`;
  const attemptsKey = `otp:attempts:${phone}`;

  // Store OTP with TTL (overwrite if previous exists)
  await redis.setex(key, OTP_TTL, otp);
  // Reset attempts counter
  await redis.setex(attemptsKey, OTP_TTL, "0");

  const message = `[SpeedyTrucks] Your OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;

  if (process.env.NODE_ENV === "production") {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`OTP sent to ${phone} for ${purpose}`);
  } else {
    // In dev mode, log OTP instead of sending SMS (saves Twilio credits)
    logger.debug(`[DEV] OTP for ${phone} (${purpose}): ${otp}`);
  }

  return true;
};

/**
 * verifyOTP — checks OTP from Redis, increments attempt counter
 */
const verifyOTP = async (phone, inputOTP, purpose = "login") => {
  const redis = getRedis();
  const key = `otp:${purpose}:${phone}`;
  const attemptsKey = `otp:attempts:${phone}`;

  // Check attempt count
  const attempts = parseInt(await redis.get(attemptsKey) || "0");
  if (attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: "MAX_ATTEMPTS", message: "Maximum OTP attempts reached. Request a new OTP." };
  }

  // Get stored OTP
  const stored = await redis.get(key);
  if (!stored) {
    return { valid: false, reason: "EXPIRED", message: "OTP expired or not found. Request a new one." };
  }

  if (stored !== inputOTP) {
    await redis.incr(attemptsKey);
    const remaining = MAX_ATTEMPTS - attempts - 1;
    return { valid: false, reason: "INVALID", message: `Incorrect OTP. ${remaining} attempt(s) remaining.` };
  }

  // Valid — delete from Redis immediately (single use)
  await redis.del(key);
  await redis.del(attemptsKey);

  return { valid: true };
};

module.exports = { sendOTP, verifyOTP };