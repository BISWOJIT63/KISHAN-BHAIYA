import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisanexpress-demo',
  allowMemoryFallback: process.env.ALLOW_MEMORY_FALLBACK !== 'false',
  autoSeedDemo: process.env.AUTO_SEED_DEMO !== 'false',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'development-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  geocodingBaseUrl: process.env.GEOCODING_BASE_URL || 'https://nominatim.openstreetmap.org',
  mandiPriceApiUrl: process.env.MANDI_PRICE_API_URL || '',
  dataGovApiKey: process.env.DATA_GOV_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  routeProvider: process.env.ROUTE_PROVIDER || 'local',
  osrmBaseUrl: (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/+$/, ''),
  /** Absolute origin this API is reachable at, used to build image URLs. Falls back to the request host. */
  publicUrl: (process.env.PUBLIC_API_URL || '').replace(/\/+$/, ''),
  cronSecret: process.env.CRON_SECRET || ''
};
