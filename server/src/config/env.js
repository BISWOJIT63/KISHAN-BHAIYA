import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kishan-bhaiya-demo',
  allowMemoryFallback: process.env.ALLOW_MEMORY_FALLBACK !== 'false',
  autoSeedDemo: process.env.AUTO_SEED_DEMO !== 'false',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  geocodingBaseUrl: process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
  cronSecret: process.env.CRON_SECRET || ''
};
