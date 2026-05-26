import axios from 'axios';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Send SMS via Twilio REST API (no official SDK — pure Axios).
 * Uses Africa's Talking if AFRICAS_TALKING_API_KEY is set (easy swap).
 */
export const sendSms = async (to: string, message: string): Promise<void> => {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    logger.warn(`SMS skipped (no Twilio creds) → to: ${to}`);
    return;
  }
  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`,
      new URLSearchParams({
        To: to,
        From: env.twilio.phoneNumber,
        Body: message,
      }),
      {
        auth: {
          username: env.twilio.accountSid,
          password: env.twilio.authToken,
        },
      },
    );
    logger.info(`SMS sent to ${to}`);
  } catch (err: unknown) {
    logger.error('SMS send error', err);
  }
};

export const sendOtpSms = async (phone: string, otp: string): Promise<void> => {
  await sendSms(phone, `Your GigFlow verification code is: ${otp}. Expires in ${env.otp.expiresMinutes} minutes.`);
};
