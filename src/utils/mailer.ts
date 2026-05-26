import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async (opts: MailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: env.smtp.from,
      ...opts,
    });
    logger.info(`Email sent to ${opts.to}: ${opts.subject}`);
  } catch (err) {
    logger.error('Email send error', err);
    // Non-blocking — don't throw; log and continue
  }
};

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  await sendMail({
    to,
    subject: 'GigFlow — Your Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#4f46e5">GigFlow</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
        <p>This code expires in ${env.otp.expiresMinutes} minutes.</p>
        <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

export const sendContractEmail = async (
  to: string,
  subject: string,
  body: string,
): Promise<void> => {
  await sendMail({ to, subject, html: body });
};
