import { Server } from 'socket.io';
import { setupChatSocket } from './chat.socket';
import { setupNotificationSocket } from './notification.socket';
import { env } from '../config/env';

export const initializeSockets = (io: Server): void => {
  io.engine.on('connection_error', (err: Error) => {
    console.error('Socket.IO connection error:', err);
  });

  setupChatSocket(io);
  setupNotificationSocket(io);
};

export const createSocketServer = (httpServer: ReturnType<typeof import('http').createServer>): Server => {
  return new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
};
