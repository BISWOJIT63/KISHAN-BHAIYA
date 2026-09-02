import { optimizeRoute } from "./routeOptimizer.js";

const activeStatuses = new Set(["IN_TRANSIT", "PICKED_UP"]);
const candidateStatuses = new Set(["PLANNED", "READY_FOR_PICKUP", "LOAD_OFFERED"]);
const availableCandidateStatuses = new Set(["PLANNED", "READY_FOR_PICKUP"]);

const pendingCandidateStops = (candidate) => (candidate.stops || []).map((stop, index) => ({
  ...stop,
  id: stop.id || `${candidate._id}-stop-${index + 1}`,
  status: "PENDING",
  sequence: undefined,
  sourceShipmentId: candidate._id,
}));

export function evaluateLoadOpportunity(active, candidate) {
  const remainingCapacity = Math.max(0, Number(active.capacity || 0) - Number(active.load || 0));
  const addedLoad = Number(candidate.load || 0);
  const reasons = [];
  if (!activeStatuses.has(active.status)) reasons.push("Trip must be in transit before adding another load");
  if (!candidateStatuses.has(candidate.status)) reasons.push("Load is no longer available for consolidation");
  if (!candidate.dispatchRequired && (candidate.vehicleId || candidate.fleetPartnerUserId)) reasons.push("Load is already assigned to another trip");
  if (candidate.loadOfferTo && candidate.loadOfferTo !== active._id) reasons.push("Load already has another active offer");
  if (addedLoad <= 0) reasons.push("Load quantity is invalid");
  if (addedLoad > remainingCapacity) reasons.push(`Needs ${addedLoad - remainingCapacity}kg more vehicle capacity`);
  if (candidate.coldChainRequired && !active.coldChain) reasons.push("Cold-chain requirement is not compatible");

  const mergedStops = [...(active.stops || []), ...pendingCandidateStops(candidate)];
  const route = optimizeRoute(
    mergedStops,
    { capacity: active.capacity, load: Number(active.load || 0) + addedLoad, coldChain: active.coldChain },
    { trigger: "IN_TRANSIT_LOAD_PREVIEW", coldChainRequired: active.coldChainRequired || candidate.coldChainRequired },
  );
  const detourKm = Number(Math.max(0, Number(route.distance || 0) - Number(active.distance || 0)).toFixed(1));
  const detourPercent = active.distance ? Math.round(detourKm / Number(active.distance) * 100) : 0;
  const maxDetourKm = Math.max(20, Number(active.distance || 0) * 0.5);
  if (detourKm > maxDetourKm) reasons.push(`Estimated ${detourKm}km detour exceeds the safe ${maxDetourKm.toFixed(1)}km limit`);
  const compatible = reasons.length === 0 && !route.capacityExceeded && !route.routeOptimization.warnings.length;
  const score = compatible
    ? Math.max(1, Math.round(100 - detourPercent - (addedLoad / Math.max(remainingCapacity, 1) * 10)))
    : 0;

  return {
    compatible,
    reasons,
    candidateShipmentId: candidate._id,
    orderIds: candidate.orderIds || [],
    addedLoad,
    remainingCapacity,
    spareCapacityAfter: Math.max(0, remainingCapacity - addedLoad),
    utilizationAfter: active.capacity ? Math.round((Number(active.load || 0) + addedLoad) / Number(active.capacity) * 100) : null,
    detourKm,
    detourPercent,
    optimizedDistance: route.distance,
    optimizedDuration: route.duration,
    addedStops: candidate.stops?.length || 0,
    pickup: candidate.stops?.find((stop) => stop.type === "PICKUP")?.label,
    delivery: [...(candidate.stops || [])].reverse().find((stop) => stop.type === "DELIVERY")?.label,
    coldChainRequired: Boolean(candidate.coldChainRequired),
    score,
    route,
  };
}

export function findLoadOpportunities(active, shipments) {
  return shipments
    .filter((candidate) => candidate._id !== active._id && availableCandidateStatuses.has(candidate.status) && candidate.dispatchRequired && !candidate.mergedIntoShipmentId && !candidate.loadOfferTo)
    .map((candidate) => ({ candidate, evaluation: evaluateLoadOpportunity(active, candidate) }))
    .filter(({ evaluation }) => evaluation.compatible)
    .sort((first, second) => second.evaluation.score - first.evaluation.score)
    .map(({ candidate, evaluation }) => ({
      ...evaluation,
      source: candidate.source,
      product: candidate.product || candidate.allocationSegments?.map((segment) => segment.product).filter(Boolean).join(", ") || "Additional marketplace load",
      candidateStatus: candidate.status,
    }));
}

export function mergeAcceptedLoad(active, candidate, offerId, acceptedBy) {
  const evaluation = evaluateLoadOpportunity(active, candidate);
  if (!evaluation.compatible) return { evaluation, shipment: null };
  const acceptedAt = new Date().toISOString();
  const acceptedRoute = {
    ...evaluation.route,
    routeOptimization: {
      ...evaluation.route.routeOptimization,
      trigger: "IN_TRANSIT_LOAD_ACCEPTED",
      optimizedAt: acceptedAt,
    },
  };
  const loadOffers = (active.loadOffers || []).map((offer) => offer.id === offerId ? {
    ...offer,
    status: "ACCEPTED",
    respondedAt: acceptedAt,
    respondedBy: acceptedBy.sub,
    respondedByRole: acceptedBy.role,
  } : offer);
  return {
    evaluation,
    shipment: {
      ...active,
      orderIds: [...new Set([...(active.orderIds || []), ...(candidate.orderIds || [])])],
      load: Number(active.load || 0) + Number(candidate.load || 0),
      coldChainRequired: Boolean(active.coldChainRequired || candidate.coldChainRequired),
      allocationSegments: [...(active.allocationSegments || []), ...(candidate.allocationSegments || [])],
      consolidatedShipmentIds: [...new Set([...(active.consolidatedShipmentIds || []), candidate._id])],
      loadOffers,
      lastLoadAcceptedAt: acceptedAt,
      lastLoadAcceptedBy: acceptedBy.sub,
      timeline: [...(active.timeline || []), `${candidate.load}kg compatible load accepted while in transit`],
      ...acceptedRoute,
      status: "IN_TRANSIT",
    },
  };
}
