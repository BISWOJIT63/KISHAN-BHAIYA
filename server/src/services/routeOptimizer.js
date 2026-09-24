import { distanceKm } from "./matching.js";

const pathDistance = (stops) => stops.slice(1).reduce(
  (total, stop, index) => total + distanceKm(stops[index].coordinates, stop.coordinates),
  0,
);

const appendNearest = (ordered, candidates) => {
  const remaining = [...candidates];
  while (remaining.length) {
    const last = ordered.at(-1);
    remaining.sort((first, second) => (
      distanceKm(last?.coordinates, first.coordinates) - distanceKm(last?.coordinates, second.coordinates)
    ));
    ordered.push(remaining.shift());
  }
};

export function optimizeRoute(stops = [], vehicle = {}, options = {}) {
  if (!stops.length) return {
    stops: [],
    distance: 0,
    duration: 0,
    utilization: vehicle.capacity ? 0 : null,
    provider: "KISHAN BHAIYA constrained route estimate",
    assumptions: "No route stops supplied",
    routeOptimization: { version: 2, trigger: options.trigger || "AUTOMATIC", savingsKm: 0, warnings: [] },
  };

  const originalDistance = pathDistance(stops);
  const completed = stops.filter((stop) => stop.status === "COMPLETED");
  const pending = stops.filter((stop) => stop.status !== "COMPLETED");
  const pickups = pending.filter((stop) => stop.type === "PICKUP");
  const hubs = pending.filter((stop) => stop.type === "HUB");
  const deliveries = pending.filter((stop) => stop.type === "DELIVERY");
  const other = pending.filter((stop) => !["PICKUP", "HUB", "DELIVERY"].includes(stop.type));
  const ordered = [...completed];

  if (!ordered.length) {
    const anchor = pickups.shift() || hubs.shift() || other.shift() || deliveries.shift();
    if (anchor) ordered.push(anchor);
  }
  appendNearest(ordered, pickups);
  appendNearest(ordered, hubs);
  appendNearest(ordered, other);
  appendNearest(ordered, deliveries);

  // Shorten detours without moving completed stops or crossing pickup/hub/delivery stages.
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    for (let start = Math.max(1, completed.length); start < ordered.length - 1; start++) {
      for (let end = start + 1; end < ordered.length; end++) {
        if (ordered.slice(start, end + 1).some(stop => stop.type !== ordered[start].type)) break;
        const candidate = [...ordered.slice(0, start), ...ordered.slice(start, end + 1).reverse(), ...ordered.slice(end + 1)];
        if (pathDistance(candidate) + 0.001 < pathDistance(ordered)) { ordered.splice(0, ordered.length, ...candidate); improved = true; }
      }
    }
    if (!improved) break;
  }
  let nextAssigned = false;
  const sequencedStops = ordered.map((stop, index) => {
    let status = stop.status;
    if (status !== "COMPLETED") {
      status = nextAssigned ? "PENDING" : "NEXT";
      nextAssigned = true;
    }
    return { ...stop, sequence: index + 1, status };
  });
  const distance = pathDistance(sequencedStops);
  const utilization = vehicle.capacity
    ? Math.round((Number(vehicle.load || 0) / Number(vehicle.capacity)) * 100)
    : null;
  const warnings = [];
  if (vehicle.capacity && Number(vehicle.load || 0) > Number(vehicle.capacity))
    warnings.push(`Load exceeds vehicle capacity by ${Number(vehicle.load) - Number(vehicle.capacity)}kg`);
  if (options.coldChainRequired && !vehicle.coldChain)
    warnings.push("Cold-chain vehicle required before dispatch");
  const duration = Math.round(distance / 32 * 60 + Math.max(0, sequencedStops.length - 2) * 18);
  const savingsKm = Math.max(0, originalDistance - distance);

  return {
    stops: sequencedStops,
    distance: Number(distance.toFixed(1)),
    duration,
    utilization,
    estimatedFuelLitres: Number((distance / (vehicle.coldChain ? 8 : 12)).toFixed(1)),
    capacityExceeded: Boolean(vehicle.capacity && Number(vehicle.load || 0) > Number(vehicle.capacity)),
    nextStop: sequencedStops.find((stop) => stop.status === "NEXT") || null,
    provider: "KISHAN BHAIYA constrained route estimate (nearest-neighbour with constrained detour reduction)",
    assumptions: "Completed stops stay fixed; pickups precede hubs and deliveries; average speed 32 km/h plus 18 minutes handling per intermediate stop",
    routeOptimization: {
      version: 2,
      trigger: options.trigger || "AUTOMATIC",
      optimizedAt: new Date().toISOString(),
      originalDistanceKm: Number(originalDistance.toFixed(1)),
      savingsKm: Number(savingsKm.toFixed(1)),
      warnings,
    },
  };
}
