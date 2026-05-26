import crypto from 'crypto';
import { redis } from '../config/redis';
import { env } from '../config/env';

const OTP_PREFIX = 'otp:';

export const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const storeOtp = async (userId: string, otp: string): Promise<void> => {
  const key = `${OTP_PREFIX}${userId}`;
  const ttl = env.otp.expiresMinutes * 60;
  await redis.setex(key, ttl, otp);
};

export const verifyOtp = async (userId: string, otp: string): Promise<boolean> => {
  const key = `${OTP_PREFIX}${userId}`;
  const stored = await redis.get(key);
  if (!stored || stored !== otp) return false;
  await redis.del(key); // consume after use
  return true;
};
