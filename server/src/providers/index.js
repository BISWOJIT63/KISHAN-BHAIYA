export const providers = {
  payment: { name: process.env.RAZORPAY_KEY_ID ? 'Razorpay test adapter' : 'Mock payment provider', configured: Boolean(process.env.RAZORPAY_KEY_ID) },
  route: { name: process.env.ROUTE_PROVIDER === 'osrm' ? 'OSRM routing adapter' : process.env.OPENROUTESERVICE_API_KEY ? 'OpenRouteService adapter' : 'Local heuristic route provider', configured: process.env.ROUTE_PROVIDER === 'osrm' || Boolean(process.env.OPENROUTESERVICE_API_KEY) },
  weather: { name: process.env.WEATHER_API_KEY ? 'Configured weather adapter' : 'Seeded advisory provider', configured: Boolean(process.env.WEATHER_API_KEY) },
  pricing: { name: process.env.MANDI_PRICE_API_URL && process.env.DATA_GOV_API_KEY ? 'Configured mandi price provider' : 'KisanExpress seeded reference provider', configured: Boolean(process.env.MANDI_PRICE_API_URL && process.env.DATA_GOV_API_KEY) },
  speech: { name: process.env.OPENAI_API_KEY ? 'OpenAI speech adapter' : 'Browser speech recognition fallback', configured: Boolean(process.env.OPENAI_API_KEY) },
  uploads: { name: process.env.CLOUDINARY_CLOUD_NAME ? 'Cloudinary adapter' : 'Local development uploads', configured: Boolean(process.env.CLOUDINARY_CLOUD_NAME) }
};
