import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDatabase = async () => {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 1800 });
    return { connected: true, mode: 'mongodb' };
  } catch (error) {
    if (!env.allowMemoryFallback || env.nodeEnv === 'production') throw error;
    console.warn('[KisanExpress] MongoDB unavailable; using labelled development memory store. Run MongoDB and npm run seed for persistent mode.');
    return { connected: false, mode: 'memory' };
  }
};
