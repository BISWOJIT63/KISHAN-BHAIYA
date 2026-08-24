import { api, getData } from "../api/client.js";

const radians = (value) => value * Math.PI / 180;

export function distanceKm(from, to) {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function coordinateLabel(latitude, longitude) {
  return `GPS ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}

export function getCurrentCoordinates() {
  if (!globalThis.navigator?.geolocation)
    return Promise.reject(new Error("Current location is not available on this device"));
  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracyMeters: Math.round(coords.accuracy),
      }),
      (error) => reject(new Error(error.code === 1
        ? "Location permission was denied. Allow it in browser settings or enter any Indian city, district or state manually."
        : "We could not detect your location. Check GPS and try again.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  });
}

export async function detectCurrentIndiaLocation() {
  const coordinates = await getCurrentCoordinates();
  const { latitude, longitude } = coordinates;
  if (latitude < 6 || latitude > 37.7 || longitude < 68 || longitude > 97.5)
    throw new Error("Your GPS position is outside the current India service boundary.");
  try {
    const resolved = await getData(api.get("/locations/reverse", { params: { latitude, longitude } }));
    return { ...resolved, name: resolved.label, ...coordinates };
  } catch (error) {
    if (error.response?.status === 400)
      throw new Error(error.response.data?.error?.message || "This GPS position is outside India");
    return {
      name: coordinateLabel(latitude, longitude),
      label: coordinateLabel(latitude, longitude),
      coordinates: [longitude, latitude],
      ...coordinates,
      provider: "Device GPS coordinates",
      approximate: true,
    };
  }
}
