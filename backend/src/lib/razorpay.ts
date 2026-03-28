import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';

export function getRazorpayClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string) {
  if (!env.razorpayWebhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.');
  }
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(payload).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string) {
  if (!env.razorpayKeySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured.');
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(body).digest('hex');
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}
