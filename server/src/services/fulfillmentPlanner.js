import { distanceKm } from "./matching.js";
import { optimizeRoute } from "./routeOptimizer.js";

const safeCoordinates = (value, fallback) => Array.isArray(value) && value.length === 2 ? value : fallback;

export function buildShipmentDrafts({
  orderId,
  requirement,
  allocations,
  vehicles = [],
  drivers = [],
  hubs = [],
}) {
  const deliveryCoordinates = safeCoordinates(requirement.coordinates, [85.8245, 20.2961]);
  const queue = allocations.map((allocation) => ({ ...allocation, remaining: allocation.quantity }));
  const usableVehicles = vehicles
    .filter((vehicle) => Number(vehicle.capacity) > 0 && ["AVAILABLE", "IDLE"].includes(vehicle.status))
    .sort((first, second) => Number(first.capacity) - Number(second.capacity));
  const activeDrivers = drivers.filter((driver) => driver.role === "driver" && driver.accountStatus === "ACTIVE" && !driver.currentShipmentId);
  const usedVehicles = new Set();
  const usedDrivers = new Set();
  const drafts = [];

  while (queue.some((allocation) => allocation.remaining > 0)) {
    const remainingTotal = queue.reduce((total, allocation) => total + allocation.remaining, 0);
    const coldChainPending = queue.some((allocation) => allocation.remaining > 0 && allocation.coldChainRequired);
    const availableVehicles = usableVehicles.filter((vehicle) => (
      !usedVehicles.has(vehicle._id) && (!coldChainPending || vehicle.coldChain)
    ));
    const vehicle = availableVehicles.find((candidate) => Number(candidate.capacity) >= remainingTotal)
      || [...availableVehicles].sort((first, second) => Number(second.capacity) - Number(first.capacity))[0]
      || null;
    const tripCapacity = vehicle ? Number(vehicle.capacity) : remainingTotal;
    let freeCapacity = tripCapacity;
    const segments = [];
    for (const allocation of queue) {
      if (allocation.remaining <= 0 || freeCapacity <= 0) continue;
      const quantity = Math.min(allocation.remaining, freeCapacity);
      segments.push({
        sellerId: allocation.sellerId,
        sellerName: allocation.seller?.name || `Supplier ${allocation.sellerId}`,
        coordinates: safeCoordinates(allocation.coordinates || allocation.seller?.coordinates, deliveryCoordinates),
        subFulfillmentId: allocation.subFulfillmentId,
        quantity,
        unit: requirement.unit,
        coldChainRequired: Boolean(allocation.coldChainRequired),
      });
      allocation.remaining -= quantity;
      freeCapacity -= quantity;
    }
    const load = segments.reduce((total, segment) => total + segment.quantity, 0);
    const coldChainRequired = segments.some((segment) => segment.coldChainRequired);
    if (!load) break;

    let driver = activeDrivers.find((candidate) => candidate._id === vehicle?.driverUserId && !usedDrivers.has(candidate._id));
    driver ||= activeDrivers.find((candidate) => !usedDrivers.has(candidate._id));
    const assigned = Boolean(vehicle && driver);
    if (vehicle) usedVehicles.add(vehicle._id);
    if (driver) usedDrivers.add(driver._id);

    const groupedPickups = Object.values(segments.reduce((groups, segment) => {
      groups[segment.sellerId] ||= { ...segment, quantity: 0, subFulfillmentIds: [] };
      groups[segment.sellerId].quantity += segment.quantity;
      groups[segment.sellerId].subFulfillmentIds.push(segment.subFulfillmentId);
      return groups;
    }, {}));
    const stops = groupedPickups.map((pickup, index) => ({
      id: `pickup-${drafts.length + 1}-${index + 1}`,
      type: "PICKUP",
      label: pickup.sellerName,
      coordinates: pickup.coordinates,
      sellerId: pickup.sellerId,
      subFulfillmentIds: pickup.subFulfillmentIds,
      quantity: pickup.quantity,
      unit: pickup.unit,
      status: "PENDING",
    }));
    if (stops.length > 1 && hubs.length) {
      const hub = [...hubs].sort((first, second) => (
        distanceKm(first.coordinates, deliveryCoordinates) - distanceKm(second.coordinates, deliveryCoordinates)
      ))[0];
      stops.push({ id: `hub-${drafts.length + 1}`, type: "HUB", label: hub.name, coordinates: hub.coordinates, hubId: hub._id, status: "PENDING" });
    }
    stops.push({
      id: `delivery-${drafts.length + 1}`,
      type: "DELIVERY",
      label: `${requirement.buyer || "Buyer"} · ${requirement.location}`,
      coordinates: deliveryCoordinates,
      quantity: load,
      unit: requirement.unit,
      status: "PENDING",
    });
    const route = optimizeRoute(
      stops,
      { capacity: tripCapacity, load, coldChain: Boolean(vehicle?.coldChain) },
      { trigger: "BULK_SPLIT_CREATED", coldChainRequired },
    );
    drafts.push({
      orderIds: [orderId],
      requirementId: requirement._id,
      source: "AUTOMATIC_BULK_SPLIT",
      status: assigned ? "READY_FOR_PICKUP" : "PLANNED",
      autoOptimized: true,
      dispatchRequired: !assigned,
      vehicleId: vehicle?._id || null,
      vehicle: vehicle ? `${vehicle.registration} · ${vehicle.type}` : "Vehicle assignment pending",
      driverUserId: driver?._id || null,
      driver: driver?.name || "Driver assignment pending",
      phone: driver?.phone ? `•••• ${String(driver.phone).slice(-4)}` : "Protected until assignment",
      capacity: tripCapacity,
      load,
      coldChain: Boolean(vehicle?.coldChain),
      coldChainRequired,
      allocationSegments: segments,
      ...route,
      automaticallyCreatedAt: new Date().toISOString(),
    });
  }
  return drafts;
}
