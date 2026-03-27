"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTwilioClient = getTwilioClient;
exports.sendVerificationOtp = sendVerificationOtp;
exports.checkVerificationOtp = checkVerificationOtp;
const twilio_1 = __importDefault(require("twilio"));
const env_1 = require("../config/env");
function getTwilioClient() {
    if (!env_1.env.twilioAccountSid || !env_1.env.twilioAuthToken) {
        return null;
    }
    return (0, twilio_1.default)(env_1.env.twilioAccountSid, env_1.env.twilioAuthToken);
}
async function sendVerificationOtp(mobileE164) {
    const client = getTwilioClient();
    if (!client || !env_1.env.twilioVerifySid) {
        throw new Error('Twilio Verify is not configured. Set TWILIO_* env vars.');
    }
    return client.verify.v2
        .services(env_1.env.twilioVerifySid)
        .verifications.create({ to: mobileE164, channel: 'sms' });
}
async function checkVerificationOtp(mobileE164, otp) {
    const client = getTwilioClient();
    if (!client || !env_1.env.twilioVerifySid) {
        throw new Error('Twilio Verify is not configured. Set TWILIO_* env vars.');
    }
    return client.verify.v2
        .services(env_1.env.twilioVerifySid)
        .verificationChecks.create({ to: mobileE164, code: otp });
}
