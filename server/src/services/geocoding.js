import { env } from "../config/env.js";
import { distanceKm } from "./matching.js";

export const indiaReferenceLocations = [
  ["Srinagar", "Jammu and Kashmir", 74.7973, 34.0837], ["Leh", "Ladakh", 77.5771, 34.1526],
  ["Chandigarh", "Chandigarh", 76.7794, 30.7333], ["Dehradun", "Uttarakhand", 78.0322, 30.3165],
  ["Shimla", "Himachal Pradesh", 77.1734, 31.1048], ["New Delhi", "Delhi", 77.209, 28.6139],
  ["Jaipur", "Rajasthan", 75.7873, 26.9124], ["Lucknow", "Uttar Pradesh", 80.9462, 26.8467],
  ["Patna", "Bihar", 85.1376, 25.5941], ["Ranchi", "Jharkhand", 85.3096, 23.3441],
  ["Gangtok", "Sikkim", 88.6138, 27.3314], ["Kolkata", "West Bengal", 88.3639, 22.5726],
  ["Guwahati", "Assam", 91.7362, 26.1445], ["Shillong", "Meghalaya", 91.8933, 25.5788],
  ["Itanagar", "Arunachal Pradesh", 93.6053, 27.0844], ["Kohima", "Nagaland", 94.1086, 25.6751],
  ["Imphal", "Manipur", 93.9368, 24.817], ["Aizawl", "Mizoram", 92.7176, 23.7271],
  ["Agartala", "Tripura", 91.2868, 23.8315], ["Bhubaneswar", "Odisha", 85.8245, 20.2961],
  ["Raipur", "Chhattisgarh", 81.6296, 21.2514], ["Bhopal", "Madhya Pradesh", 77.4126, 23.2599],
  ["Ahmedabad", "Gujarat", 72.5714, 23.0225], ["Mumbai", "Maharashtra", 72.8777, 19.076],
  ["Panaji", "Goa", 73.8278, 15.4909], ["Hyderabad", "Telangana", 78.4867, 17.385],
  ["Vijayawada", "Andhra Pradesh", 80.648, 16.5062], ["Bengaluru", "Karnataka", 77.5946, 12.9716],
  ["Chennai", "Tamil Nadu", 80.2707, 13.0827], ["Thiruvananthapuram", "Kerala", 76.9366, 8.5241],
  ["Puducherry", "Puducherry", 79.8083, 11.9416], ["Port Blair", "Andaman and Nicobar Islands", 92.7265, 11.6234],
].map(([name, state, longitude, latitude]) => ({ name, state, longitude, latitude }));

const cache = new Map();
const inIndiaBounds = (latitude, longitude) => latitude >= 6 && latitude <= 37.7 && longitude >= 68 && longitude <= 97.5;
const clean = (value) => String(value || "").trim();

function nearestReference(latitude, longitude) {
  const current = [longitude, latitude];
  return indiaReferenceLocations
    .map((location) => ({ ...location, distanceKm: distanceKm(current, [location.longitude, location.latitude]) }))
    .sort((first, second) => first.distanceKm - second.distanceKm)[0];
}

function fallbackLocation(latitude, longitude) {
  const nearest = nearestReference(latitude, longitude);
  return {
    label: `${nearest.name}, ${nearest.state}`,
    city: nearest.name,
    state: nearest.state,
    country: "India",
    coordinates: [longitude, latitude],
    provider: "India-wide offline reference fallback",
    approximate: true,
    referenceDistanceKm: Number(nearest.distanceKm.toFixed(1)),
  };
}

export async function reverseIndiaLocation(latitude, longitude, { online = env.nodeEnv !== "test", fetchImpl = globalThis.fetch } = {}) {
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Latitude and longitude must be valid numbers");
  if (!inIndiaBounds(lat, lon)) throw new Error("The detected coordinates are outside the supported India service boundary");
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (online && fetchImpl) {
    try {
      const url = new URL("reverse", `${env.geocodingBaseUrl.replace(/\/$/, "")}/`);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("zoom", "12");
      url.searchParams.set("addressdetails", "1");
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "Kishan-Bhaiya-Agriculture-Demo/1.0" },
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const result = await response.json();
        const address = result.address || {};
        if (clean(address.country_code).toLowerCase() === "in") {
          const city = clean(address.city || address.town || address.village || address.municipality || address.county);
          const district = clean(address.state_district || address.county);
          const state = clean(address.state);
          const parts = [...new Set([city, district && district !== city ? district : "", state].filter(Boolean))];
          const resolved = {
            label: parts.join(", ") || clean(result.display_name),
            city: city || district,
            district,
            state,
            country: "India",
            postalCode: clean(address.postcode),
            coordinates: [lon, lat],
            provider: "OpenStreetMap Nominatim reverse geocoding",
            approximate: false,
          };
          cache.set(cacheKey, resolved);
          return resolved;
        }
      }
    } catch {
      /** A precise provider failure falls through to the honest India-wide reference result. */
    }
  }
  const fallback = fallbackLocation(lat, lon);
  cache.set(cacheKey, fallback);
  return fallback;
}
