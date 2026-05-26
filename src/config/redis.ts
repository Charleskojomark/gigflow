import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisConfig = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  lazyConnect: true,
  retryStrategy(times: number) {
    if (times > 5) {
      logger.error('Redis: max retries reached');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) return true;
    return false;
  },
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => logger.info('Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error('Redis error:', err));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', () => logger.warn('Redis reconnecting...'));

export const connectRedis = async (): Promise<void> => {
  await redis.connect();
};

// ─── Helper wrappers ─────────────────────────────────────────────
export const redisGet = async (key: string): Promise<string | null> => {
  return redis.get(key);
};

export const redisSet = async (
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> => {
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, value);
  } else {
    await redis.set(key, value);
  }
};

export const redisDel = async (key: string): Promise<void> => {
  await redis.del(key);
};

export const redisExists = async (key: string): Promise<boolean> => {
  const result = await redis.exists(key);
  return result === 1;
};
