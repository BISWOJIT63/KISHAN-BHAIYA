export const providers = {
  payment: { name: process.env.RAZORPAY_KEY_ID ? 'Razorpay test adapter' : 'Mock payment provider', configured: Boolean(process.env.RAZORPAY_KEY_ID) },
  route: { name: process.env.OPENROUTESERVICE_API_KEY ? 'OpenRouteService adapter' : 'Local heuristic route provider', configured: Boolean(process.env.OPENROUTESERVICE_API_KEY) },
  weather: { name: process.env.WEATHER_API_KEY ? 'Configured weather adapter' : 'Seeded advisory provider', configured: Boolean(process.env.WEATHER_API_KEY) },
  pricing: { name: 'Kishan Bhaiya seeded reference provider', configured: false },
  uploads: { name: process.env.CLOUDINARY_CLOUD_NAME ? 'Cloudinary adapter' : 'Local development uploads', configured: Boolean(process.env.CLOUDINARY_CLOUD_NAME) }
};
