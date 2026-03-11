import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const getTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendPasswordResetEmail = async (email, resetUrl) => {
  if (!process.env.SMTP_USER) { logger.warn('SMTP not configured — skip email'); return; }
  await getTransporter().sendMail({
    from:    `"APTrucking" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Reset your APTrucking password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>🚛 APTrucking — Password Reset</h2>
        <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#1660F5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Reset Password</a>
        <p style="color:#888;font-size:13px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
  logger.info(`Password reset email sent to ${email}`);
};

export const sendWelcomeEmail = async (email, name) => {
  if (!process.env.SMTP_USER) return;
  await getTransporter().sendMail({
    from:    `"APTrucking" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Welcome to APTrucking!',
    html: `<div style="font-family:sans-serif"><h2>Welcome, ${name}! 🚛</h2><p>Your APTrucking account is ready. Start posting loads or finding trucks today.</p><a href="https://www.aptrucking.in/dashboard" style="background:#1660F5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">Go to Dashboard</a></div>`,
  });
};
