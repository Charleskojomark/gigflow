import { Server, Socket } from 'socket.io';
import { verifyAccessToken, isTokenBlacklisted } from '../utils/token';
import { logger } from '../utils/logger';

export const setupChatSocket = (io: Server): void => {
  const chatNs = io.of('/chat');

  chatNs.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));
      if (await isTokenBlacklisted(token)) return next(new Error('Token revoked'));
      const payload = verifyAccessToken(token);
      (socket as Socket & { user?: { userId: string; role: string; email: string } }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  chatNs.on('connection', (socket: Socket & { user?: { userId: string; role: string } }) => {
    logger.debug(`Socket connected: ${socket.id} user: ${socket.user?.userId}`);

    // Join contract room
    socket.on('join:contract', (contractId: string) => {
      socket.join(`contract:${contractId}`);
      logger.debug(`${socket.user?.userId} joined contract:${contractId}`);
    });

    socket.on('leave:contract', (contractId: string) => {
      socket.leave(`contract:${contractId}`);
    });

    // Real-time message relay (persisted separately via REST API)
    socket.on('message:send', (data: { contractId: string; content: string; type?: string }) => {
      chatNs.to(`contract:${data.contractId}`).emit('message:new', {
        senderId: socket.user?.userId,
        content: data.content,
        type: data.type || 'text',
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on('typing:start', (contractId: string) => {
      socket.to(`contract:${contractId}`).emit('typing:start', { userId: socket.user?.userId });
    });

    socket.on('typing:stop', (contractId: string) => {
      socket.to(`contract:${contractId}`).emit('typing:stop', { userId: socket.user?.userId });
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });
};
