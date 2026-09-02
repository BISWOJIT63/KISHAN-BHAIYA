import { env } from "../config/env.js";

const validCoordinates = (stop) => Array.isArray(stop?.coordinates)
  && stop.coordinates.length === 2
  && stop.coordinates.every(Number.isFinite);

/**
 * Adds road distance and duration from OSRM without weakening the local
 * pickup → hub → delivery ordering and capacity checks. Network errors retain
 * the local estimate so dispatch never fails just because routing is offline.
 */
export const enrichRouteWithOsrm = async (route) => {
  if (env.routeProvider !== "osrm" || env.nodeEnv === "test") return route;
  const stops = route.stops?.filter(validCoordinates) || [];
  if (stops.length < 2) return route;
  const coordinates = stops.map((stop) => stop.coordinates.join(",")).join(";");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(
      `${env.osrmBaseUrl}/route/v1/driving/${coordinates}?overview=false`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) return route;
    const data = await response.json();
    const result = data.routes?.[0];
    if (!result || !Number.isFinite(result.distance) || !Number.isFinite(result.duration)) return route;
    return {
      ...route,
      distance: Number((result.distance / 1000).toFixed(1)),
      duration: Math.round(result.duration / 60),
      estimatedFuelLitres: Number(((result.distance / 1000) / 12).toFixed(1)),
      provider: "OSRM road-route estimate",
      assumptions: `${route.assumptions} Road distance and duration are supplied by OSRM when available.`,
    };
  } catch {
    return route;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Re-estimates only the unfinished portion of a trip from the driver's latest
 * GPS point. It deliberately leaves the operational stop order untouched: the
 * constrained optimiser remains responsible for pickup/hub/delivery ordering.
 */
export const liveRouteEstimate = async (coordinates, stops = []) => {
  const pendingStops = stops.filter(
    (stop) => stop.status !== "COMPLETED" && validCoordinates(stop),
  );
  if (
    env.routeProvider !== "osrm" ||
    env.nodeEnv === "test" ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(Number.isFinite) ||
    !pendingStops.length
  )
    return null;
  const routeCoordinates = [coordinates, ...pendingStops.map((stop) => stop.coordinates)]
    .map((point) => point.join(","))
    .join(";");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(
      `${env.osrmBaseUrl}/route/v1/driving/${routeCoordinates}?overview=false`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const route = (await response.json()).routes?.[0];
    if (!route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration))
      return null;
    return {
      remainingDistance: Number((route.distance / 1000).toFixed(1)),
      remainingDuration: Math.max(1, Math.round(route.duration / 60)),
      provider: "OSRM live road-route estimate",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
