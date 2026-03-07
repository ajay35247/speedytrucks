/**
 * Email Service — Nodemailer for transactional emails
 */
const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    throw err;
  }
};

const passwordResetEmail = (name, resetURL) => ({
  subject: "Reset your SpeedyTrucks password",
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 32px;">
      <h2 style="color: #1660F5;">SpeedyTrucks Password Reset</h2>
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the button below (valid 1 hour):</p>
      <a href="${resetURL}" style="display:inline-block;padding:12px 24px;background:#1660F5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a>
      <p style="color:#999;margin-top:24px;font-size:12px;">If you didn't request this, ignore this email. Your password will remain unchanged.</p>
    </div>
  `,
});

const welcomeEmail = (name, role) => ({
  subject: "Welcome to SpeedyTrucks!",
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 32px;">
      <h2 style="color: #1660F5;">Welcome to SpeedyTrucks 🚛</h2>
      <p>Hi ${name},</p>
      <p>Your <strong>${role}</strong> account has been created successfully.</p>
      <p>Complete your KYC verification to unlock all platform features.</p>
      <a href="${process.env.CLIENT_URL}/kyc" style="display:inline-block;padding:12px 24px;background:#00C27A;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Complete KYC</a>
    </div>
  `,
});

module.exports = { sendEmail, passwordResetEmail, welcomeEmail };