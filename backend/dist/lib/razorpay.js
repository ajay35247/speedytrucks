"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRazorpayClient = getRazorpayClient;
exports.verifyRazorpayWebhookSignature = verifyRazorpayWebhookSignature;
exports.verifyRazorpayPaymentSignature = verifyRazorpayPaymentSignature;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const env_1 = require("../config/env");
function getRazorpayClient() {
    if (!env_1.env.razorpayKeyId || !env_1.env.razorpayKeySecret) {
        throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    return new razorpay_1.default({
        key_id: env_1.env.razorpayKeyId,
        key_secret: env_1.env.razorpayKeySecret,
    });
}
function verifyRazorpayWebhookSignature(payload, signature) {
    if (!env_1.env.razorpayWebhookSecret) {
        throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured.');
    }
    const expected = crypto_1.default.createHmac('sha256', env_1.env.razorpayWebhookSecret).update(payload).digest('hex');
    if (expected.length !== signature.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}
function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
    if (!env_1.env.razorpayKeySecret) {
        throw new Error('RAZORPAY_KEY_SECRET is not configured.');
    }
    const body = `${orderId}|${paymentId}`;
    const expected = crypto_1.default.createHmac('sha256', env_1.env.razorpayKeySecret).update(body).digest('hex');
    if (expected.length !== signature.length)
        return false;
    return crypto_1.default.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}
