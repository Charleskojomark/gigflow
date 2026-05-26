import { Server } from 'socket.io';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Subscribe to Redis pub/sub channel "notifications".
 * When a notification is published, push it to the target user's Socket.IO room.
 */
export const setupNotificationSocket = (io: Server): void => {
  // Use a dedicated subscriber client (ioredis in subscribe mode is exclusive)
  const subscriber = redis.duplicate();

  subscriber.subscribe('notifications', (err) => {
    if (err) {
      logger.error('Redis subscribe error', err);
    } else {
      logger.info('Subscribed to Redis notifications channel');
    }
  });

  subscriber.on('message', (_channel, message) => {
    try {
      const payload = JSON.parse(message) as { userId: string; [key: string]: unknown };
      io.of('/notifications').to(`user:${payload.userId}`).emit('notification', payload);
      logger.debug(`Push notification to user:${payload.userId}`);
    } catch (err) {
      logger.error('Notification socket parse error', err);
    }
  });

  const notifNs = io.of('/notifications');

  notifNs.use((socket, next) => {
    // Simple token validation (reuse chat auth pattern)
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const { verifyAccessToken } = require('../utils/token');
      const payload = verifyAccessToken(token);
      (socket as typeof socket & { userId?: string }).userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  notifNs.on('connection', (socket) => {
    const userId = (socket as typeof socket & { userId?: string }).userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug(`Notification socket joined: user:${userId}`);
    }
    socket.on('disconnect', () => {
      logger.debug(`Notification socket disconnected: ${socket.id}`);
    });
  });
};
