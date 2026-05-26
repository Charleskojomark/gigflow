import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { redis } from '../../config/redis';
import { env } from '../../config/env';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let redisStatus = 'disconnected';
  try {
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'connected' : 'degraded';
  } catch {
    redisStatus = 'disconnected';
  }

  const healthy = mongoStatus === 'connected' && redisStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
    },
  });
});

router.get('/metrics', (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
    nodeVersion: process.version,
    pid: process.pid,
  });
});

export default router;
