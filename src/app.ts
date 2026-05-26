import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger';

// Routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import jobsRoutes from './modules/jobs/jobs.routes';
import bidsRoutes from './modules/bids/bids.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import messagesRoutes from './modules/messages/messages.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adminRoutes from './modules/admin/admin.routes';
import healthRoutes from './modules/health/health.routes';

export const createApp = (): Application => {
  const app = express();

  // --- Security ---
  app.use(helmet());
  app.use(cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }));

  // --- Request parsing ---
  // NOTE: /api/payments/webhook uses raw body, registered before json()
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- Logging & correlation ---
  app.use(requestIdMiddleware);
  app.use(morgan(env.isProduction ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));

  // --- Rate limiting ---
  app.use('/api', apiLimiter);

  // --- Routes ---
  app.use('/', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/bids', bidsRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/contracts/:contractId/messages', messagesRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/admin', adminRoutes);

  // --- Error handling ---
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
