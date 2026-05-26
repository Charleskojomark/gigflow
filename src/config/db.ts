import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
let retries = 0;

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
    retries = 0;

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
      reconnect();
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error:', err);
    });
  } catch (err) {
    logger.error(`MongoDB connection failed (attempt ${retries + 1}):`, err);
    retries++;
    if (retries < MAX_RETRIES) {
      setTimeout(() => connectDB(), 5000 * retries);
    } else {
      logger.error('Max MongoDB reconnect attempts reached. Exiting.');
      process.exit(1);
    }
  }
};

const reconnect = () => {
  if (retries < MAX_RETRIES) {
    retries++;
    setTimeout(() => connectDB(), 5000);
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected gracefully');
};
