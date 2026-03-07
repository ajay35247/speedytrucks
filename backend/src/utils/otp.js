/**
 * OTP Service
 * Generates 6-digit OTPs, stores in Redis with 5min TTL,
 * enforces max 3 retries, integrates Twilio for SMS delivery
 */

const { getRedis } = require("../config/redis");
const logger = require("./logger");

const OTP_TTL = 5 * 60;          // 5 minutes in seconds
const MAX_RETRIES = 3;
const RESEND_COOLDOWN = 60;       // 60 seconds before resend allowed

// ── Twilio client (lazy init) ──────────────────────────────────
let twilioClient;
const getTwilio = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID) {
    twilioClient = require("twilio")(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
};

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP in Redis with metadata
 * Key: otp:<purpose>:<identifier>
 */
const storeOTP = async (identifier, purpose, otp) => {
  const redis = getRedis();
  const key = `otp:${purpose}:${identifier}`;
  const cooldownKey = `otp_cooldown:${purpose}:${identifier}`;

  // Check cooldown (prevent spam)
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    throw new Error(`Please wait ${RESEND_COOLDOWN}s before requesting another OTP`);
  }

  const data = JSON.stringify({ otp, attempts: 0, createdAt: Date.now() });

  // Store OTP with 5min expiry
  await redis.set(key, data, "EX", OTP_TTL);

  // Set cooldown (shorter: only 60s)
  await redis.set(cooldownKey, "1", "EX", RESEND_COOLDOWN);

  return otp;
};

/**
 * Verify OTP – checks value, expiry, and retry limit
 * Returns: { valid: bool, reason: string }
 */
const verifyOTP = async (identifier, purpose, submittedOtp) => {
  const redis = getRedis();
  const key = `otp:${purpose}:${identifier}`;

  const raw = await redis.get(key);
  if (!raw) {
    return { valid: false, reason: "OTP expired or not found" };
  }

  const data = JSON.parse(raw);

  if (data.attempts >= MAX_RETRIES) {
    await redis.del(key);
    return { valid: false, reason: "Max OTP attempts exceeded. Please request a new OTP." };
  }

  if (data.otp !== submittedOtp) {
    // Increment attempts
    data.attempts += 1;
    await redis.set(key, JSON.stringify(data), "KEEPTTL");
    return {
      valid: false,
      reason: `Incorrect OTP. ${MAX_RETRIES - data.attempts} attempt(s) remaining.`,
    };
  }

  // Valid! Delete from Redis immediately
  await redis.del(key);
  return { valid: true, reason: "OTP verified" };
};

/**
 * Send OTP via Twilio SMS
 */
const sendSMSOTP = async (phone, otp, purpose = "verification") => {
  const client = getTwilio();

  const purposeMessages = {
    phone_verification: `Your SpeedyTrucks phone verification OTP is ${otp}. Valid for 5 minutes. Do not share it.`,
    login: `Your SpeedyTrucks login OTP is ${otp}. Valid for 5 minutes. Do not share it.`,
    password_reset: `Your SpeedyTrucks password reset OTP is ${otp}. Valid for 5 minutes. Do not share it.`,
    twofa: `Your SpeedyTrucks 2FA code is ${otp}. Valid for 5 minutes.`,
  };

  const body = purposeMessages[purpose] || `Your SpeedyTrucks OTP is ${otp}. Valid for 5 minutes.`;

  if (!client) {
    // Dev fallback – log to console
    logger.info(`[DEV] SMS OTP for ${phone} [${purpose}]: ${otp}`);
    return { sid: "dev-mock", status: "delivered" };
  }

  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  logger.info(`OTP SMS sent to ${phone} | SID: ${message.sid}`);
  return message;
};

/**
 * Full flow: generate + store + send via SMS
 */
const requestOTP = async (phone, purpose) => {
  const otp = generateOTP();
  await storeOTP(phone, purpose, otp);
  await sendSMSOTP(phone, otp, purpose);
  return { message: "OTP sent successfully", expiresIn: OTP_TTL };
};

module.exports = { requestOTP, verifyOTP, storeOTP, generateOTP };
