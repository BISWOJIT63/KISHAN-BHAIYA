import { env } from '../config/env.js';
export const validPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
const cache = new Map();
export async function roadRoute(points, fetchImpl = fetch) {
  if (points.length < 2 || points.length > 25 || !points.every(validPoint)) throw new Error('Provide 2–25 valid map coordinates');
  const key = JSON.stringify(points);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 300000) return cached.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(`${env.osrmBaseUrl}/route/v1/driving/${points.map(p => p.join(',')).join(';')}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
    if (!response.ok) throw new Error('Road routing is unavailable');
    const data = await response.json();
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route || route.geometry?.type !== 'LineString' || !route.geometry.coordinates?.length || !route.geometry.coordinates.every(validPoint) || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) throw new Error('No drivable road route was found');
    const value = { geometry: route.geometry, distance: Number((route.distance / 1000).toFixed(1)), duration: Math.round(route.duration / 60), provider: 'OSRM road route' };
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), value });
    return value;
  } finally { clearTimeout(timeout); }
}
