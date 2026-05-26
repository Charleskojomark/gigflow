import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
};

/** Blacklist a token in Redis until its natural expiry */
export const blacklistToken = async (token: string, expiresInSeconds: number): Promise<void> => {
  await redis.setex(`bl:${token}`, expiresInSeconds, '1');
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const result = await redis.get(`bl:${token}`);
  return result === '1';
};
