import twilio from 'twilio';
import { env } from '../config/env';

export function getTwilioClient() {
  if (!env.twilioAccountSid || !env.twilioAuthToken) {
    return null;
  }
  return twilio(env.twilioAccountSid, env.twilioAuthToken);
}

export async function sendVerificationOtp(mobileE164: string) {
  const client = getTwilioClient();
  if (!client || !env.twilioVerifySid) {
    throw new Error('Twilio Verify is not configured. Set TWILIO_* env vars.');
  }

  return client.verify.v2
    .services(env.twilioVerifySid)
    .verifications.create({ to: mobileE164, channel: 'sms' });
}

export async function checkVerificationOtp(mobileE164: string, otp: string) {
  const client = getTwilioClient();
  if (!client || !env.twilioVerifySid) {
    throw new Error('Twilio Verify is not configured. Set TWILIO_* env vars.');
  }

  return client.verify.v2
    .services(env.twilioVerifySid)
    .verificationChecks.create({ to: mobileE164, code: otp });
}
