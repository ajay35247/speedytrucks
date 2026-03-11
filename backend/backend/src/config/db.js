import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { dbName: 'speedytrucks' });
    isConnected = true;
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
