import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { redis } from './config/redis';
import { createSocketServer, initializeSockets } from './sockets';
import { env } from './config/env';
import { logger } from './utils/logger';

const bootstrap = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDB();

  // Ensure Redis is connected
  await redis.ping();
  logger.info('Redis connected');

  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  const io = createSocketServer(httpServer);
  initializeSockets(io);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 GigFlow API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Health: http://localhost:${env.PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await redis.quit();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
    process.exit(1);
  });
};

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
