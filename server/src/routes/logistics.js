import { z } from "zod";
import { nanoid } from "nanoid";
import { store } from "../services/dataStore.js";
import {
  evaluateLoadOpportunity,
  findLoadOpportunities,
  mergeAcceptedLoad,
} from "../services/loadSharing.js";
import { liveRouteEstimate } from "../services/osrm.js";
import { optimizeStoredShipment } from "../services/shipmentRouting.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, HttpError, ok } from "../utils/http.js";

const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);
const id = (prefix) => `${prefix}-${nanoid(8)}`;
const accountStatusOf = (user) =>
  user?.accountStatus || (user?.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");

const shipmentDispatchSchema = z.object({
  vehicleId: z.string().min(2),
});
const shipmentStopSchema = z.object({
  notes: z.string().trim().max(500).optional().default(""),
  quantity: z.coerce.number().min(0).optional(),
});
const shipmentIssueSchema = z.object({
  type: z.enum([
    "BREAKDOWN",
    "TRAFFIC",
    "WEATHER",
    "QUALITY",
    "QUANTITY",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  message: z.string().trim().min(3).max(500),
});
const shipmentLocationSchema = z.object({
  longitude: z.coerce.number().min(68).max(97.5),
  latitude: z.coerce.number().min(6).max(37.7),
  speedKph: z.coerce.number().min(0).max(180).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
});
const loadOfferSchema = z.object({
  candidateShipmentId: z.string().min(2),
});
const loadOfferResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  note: z.string().trim().max(500).optional().default(""),
});
/**
 * A shipment reaching DELIVERED used to leave its orders stuck at IN_TRANSIT
 * forever, which meant the delivery review could never unlock. Both delivery
 * paths (proof-of-delivery and the last route stop) funnel through here.
 */
const markOrdersDelivered = async (req, shipment) => {
  const orderIds = shipment.orderIds?.length
    ? shipment.orderIds
    : shipment.orderId
      ? [shipment.orderId]
      : [];
  const deliveredAt = shipment.deliveredAt || new Date().toISOString();
  const orders = (
    await Promise.all(orderIds.map((orderId) => store.get("orders", orderId)))
  ).filter((order) => order && order.status !== "DELIVERED");
  for (const order of orders) {
    const updated = await store.update("orders", order._id, {
      status: "DELIVERED",
      deliveredAt,
      deliveryDate: order.deliveryDate || deliveredAt,
    });
    await store.create(
      "notifications",
      {
        userId: order.buyerId,
        title: "Order delivered",
        message:
          "Your order arrived. Share a rating so other buyers know what to expect.",
        type: "ORDER_DELIVERED",
        entityId: order._id,
        actionPath: `/orders/${order._id}/review`,
        read: false,
      },
      "note",
    );
    emit(req, "order:statusChanged", updated);
    emit(req, "notification:new", {
      type: "ORDER_DELIVERED",
      orderId: order._id,
    });
  }
  return orders.length;
};

/** Keep the buyer and producer order views aligned with the assigned trip. */
const markOrdersInTransit = async (req, shipment) => {
  const orderIds = shipment.orderIds?.length
    ? shipment.orderIds
    : shipment.orderId
      ? [shipment.orderId]
      : [];
  const orders = (
    await Promise.all(orderIds.map((orderId) => store.get("orders", orderId)))
  ).filter(
    (order) =>
      order &&
      !["DELIVERED", "CANCELLED", "PENDING_SELLER"].includes(order.status),
  );
  for (const order of orders) {
    if (order.status === "IN_TRANSIT") continue;
    const updated = await store.update("orders", order._id, {
      status: "IN_TRANSIT",
      inTransitAt: shipment.startedAt || new Date().toISOString(),
      deliveryDate:
        order.deliveryDate || shipment.estimatedArrival || undefined,
    });
    emit(req, "order:statusChanged", updated);
  }
  return orders.length;
};

const assertShipmentAccess = (
  req,
  shipment,
  message = "Drivers can access only their assigned shipments",
) => {
  if (req.user.role === "driver" && shipment.driverUserId !== req.user.sub)
    throw new HttpError(403, message);
  if (
    req.user.role === "logistics_partner" &&
    shipment.fleetPartnerUserId &&
    shipment.fleetPartnerUserId !== req.user.sub
  )
    throw new HttpError(403, message);
};

export function registerLogisticsRoutes(router) {
  router.get(
    "/shipments",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics", "admin"),
    asyncHandler(async (req, res) => {
      const shipments = await store.list(
        "shipments",
        req.user.role === "driver" ? { driverUserId: req.user.sub } : {},
      );
      const optimized = await Promise.all(
        shipments.map((shipment) =>
          shipment.status !== "DELIVERED" &&
          shipment.routeOptimization?.version !== 2
            ? optimizeStoredShipment(shipment, "AUTOMATIC_ACCESS")
            : shipment,
        ),
      );
      ok(res, optimized);
    }),
  );
  router.get(
    "/shipments/:id",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics", "admin"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(req, shipment);
      const optimized =
        shipment.status !== "DELIVERED" &&
        shipment.routeOptimization?.version !== 2
          ? await optimizeStoredShipment(shipment, "AUTOMATIC_ACCESS")
          : shipment;
      ok(res, optimized);
    }),
  );
  router.get(
    "/shipments/:id/load-opportunities",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(req, shipment);
      const opportunities = findLoadOpportunities(
        shipment,
        await store.list("shipments"),
      );
      ok(res, {
        shipmentId: shipment._id,
        remainingCapacity: Math.max(
          0,
          Number(shipment.capacity || 0) - Number(shipment.load || 0),
        ),
        opportunities,
        rules:
          "In-transit only · remaining capacity · cold-chain compatible · maximum 50% route detour",
      });
    }),
  );
  router.post(
    "/shipments/:id/load-offers",
    requireAuth,
    allowRoles("logistics_partner", "logistics"),
    validate(loadOfferSchema),
    asyncHandler(async (req, res) => {
      const [shipment, candidate] = await Promise.all([
        store.get("shipments", req.params.id),
        store.get("shipments", req.body.candidateShipmentId),
      ]);
      if (!shipment) throw new HttpError(404, "Active shipment not found");
      if (!candidate) throw new HttpError(404, "Additional load not found");
      if (
        (shipment.loadOffers || []).some(
          (offer) =>
            offer.candidateShipmentId === candidate._id &&
            offer.status === "PENDING_FLEET",
        )
      )
        throw new HttpError(409, "This load is already awaiting a response");
      const opportunity = findLoadOpportunities(shipment, [candidate])[0];
      if (!opportunity) {
        const evaluation = evaluateLoadOpportunity(shipment, candidate);
        throw new HttpError(
          409,
          evaluation.reasons.join(". ") ||
            "This load is not compatible with the active trip",
        );
      }
      const offer = {
        id: id("load-offer"),
        candidateShipmentId: candidate._id,
        orderIds: candidate.orderIds || [],
        addedLoad: opportunity.addedLoad,
        pickup: opportunity.pickup,
        delivery: opportunity.delivery,
        detourKm: opportunity.detourKm,
        detourPercent: opportunity.detourPercent,
        utilizationAfter: opportunity.utilizationAfter,
        spareCapacityAfter: opportunity.spareCapacityAfter,
        optimizedDistance: opportunity.optimizedDistance,
        optimizedDuration: opportunity.optimizedDuration,
        status: "PENDING_FLEET",
        proposedBy: req.user.sub,
        proposedAt: new Date().toISOString(),
      };
      const updated = await store.update("shipments", shipment._id, {
        loadOffers: [...(shipment.loadOffers || []), offer],
        timeline: [
          ...(shipment.timeline || []),
          `${candidate.load}kg in-transit load offered for fleet review`,
        ],
      });
      await store.update("shipments", candidate._id, {
        status: "LOAD_OFFERED",
        loadOfferTo: shipment._id,
        loadOfferId: offer.id,
      });
      await Promise.all([
        shipment.fleetPartnerUserId
          ? store.create(
              "notifications",
              {
                userId: shipment.fleetPartnerUserId,
                title: "Compatible load available on your route",
                message: `${offer.addedLoad}kg · ${offer.detourKm}km estimated detour · review before accepting.`,
                type: "IN_TRANSIT_LOAD_OFFER",
                entityId: shipment._id,
                read: false,
              },
              "note",
            )
          : Promise.resolve(),
        store.create(
          "auditLogs",
          {
            actorId: req.user.sub,
            action: "IN_TRANSIT_LOAD_OFFERED",
            entityType: "Shipment",
            entityId: shipment._id,
            metadata: {
              offerId: offer.id,
              candidateShipmentId: candidate._id,
              addedLoad: offer.addedLoad,
              detourKm: offer.detourKm,
            },
          },
          "audit",
        ),
      ]);
      emit(req, "shipment:statusChanged", updated);
      ok(res, { shipment: updated, offer });
    }),
  );
  router.post(
    "/shipments/:id/load-offers/:offerId/respond",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    validate(loadOfferResponseSchema),
    asyncHandler(async (req, res) => {
      const result = await store.transaction(async (session) => {
        const shipment = await store.get("shipments", req.params.id, session);
        if (!shipment) throw new HttpError(404, "Active shipment not found");
        assertShipmentAccess(
          req,
          shipment,
          "Fleet partners can respond only to loads offered to their assigned trip",
        );
        const offer = (shipment.loadOffers || []).find(
          (candidateOffer) => candidateOffer.id === req.params.offerId,
        );
        if (!offer) throw new HttpError(404, "Load offer not found");
        if (offer.status !== "PENDING_FLEET")
          throw new HttpError(409, "This load offer has already been answered");
        const candidate = await store.get(
          "shipments",
          offer.candidateShipmentId,
          session,
        );
        if (!candidate)
          throw new HttpError(404, "Additional load is no longer available");
        if (req.body.action === "DECLINE") {
          const respondedAt = new Date().toISOString();
          const loadOffers = shipment.loadOffers.map((candidateOffer) =>
            candidateOffer.id === offer.id
              ? {
                  ...candidateOffer,
                  status: "DECLINED",
                  responseNote: req.body.note,
                  respondedAt,
                  respondedBy: req.user.sub,
                  respondedByRole: req.user.role,
                }
              : candidateOffer,
          );
          const updated = await store.update(
            "shipments",
            shipment._id,
            {
              loadOffers,
              timeline: [
                ...(shipment.timeline || []),
                `${candidate.load}kg in-transit load declined`,
              ],
            },
            session,
          );
          const availableCandidate = await store.update(
            "shipments",
            candidate._id,
            { status: "PLANNED", loadOfferTo: null, loadOfferId: null },
            session,
          );
          return {
            shipment: updated,
            candidate: availableCandidate,
            offer: loadOffers.find((item) => item.id === offer.id),
          };
        }
        const merged = mergeAcceptedLoad(
          shipment,
          candidate,
          offer.id,
          req.user,
        );
        if (!merged.shipment)
          throw new HttpError(
            409,
            merged.evaluation.reasons.join(". ") ||
              "The load no longer fits this trip",
          );
        const changes = { ...merged.shipment };
        delete changes._id;
        delete changes.createdAt;
        delete changes.updatedAt;
        const updated = await store.update(
          "shipments",
          shipment._id,
          changes,
          session,
        );
        const mergedCandidate = await store.update(
          "shipments",
          candidate._id,
          {
            status: "MERGED_IN_TRANSIT",
            dispatchRequired: false,
            mergedIntoShipmentId: shipment._id,
            mergedAt: new Date().toISOString(),
            loadOfferTo: shipment._id,
          },
          session,
        );
        return {
          shipment: updated,
          candidate: mergedCandidate,
          offer: updated.loadOffers.find((item) => item.id === offer.id),
          evaluation: merged.evaluation,
        };
      });
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action:
            req.body.action === "ACCEPT"
              ? "IN_TRANSIT_LOAD_ACCEPTED"
              : "IN_TRANSIT_LOAD_DECLINED",
          entityType: "Shipment",
          entityId: req.params.id,
          metadata: {
            offerId: req.params.offerId,
            candidateShipmentId: result.candidate._id,
            newLoad: result.shipment.load,
          },
        },
        "audit",
      );
      const dispatchers = (await store.list("users")).filter(
        (user) =>
          ["logistics_partner", "logistics"].includes(user.role) &&
          accountStatusOf(user) === "ACTIVE" &&
          user._id !== req.user.sub,
      );
      const responseLabel =
        req.body.action === "ACCEPT" ? "accepted" : "declined";
      await Promise.all(
        dispatchers.map((dispatcher) =>
          store.create(
            "notifications",
            {
              userId: dispatcher._id,
              title: `In-transit load ${responseLabel}`,
              message: `${result.candidate.load}kg load for ${result.shipment._id} was ${responseLabel}.`,
              type: "IN_TRANSIT_LOAD_RESPONSE",
              entityId: result.shipment._id,
              read: false,
            },
            "note",
          ),
        ),
      );
      emit(req, "shipment:statusChanged", result.shipment);
      ok(res, result);
    }),
  );
  router.post(
    "/shipments/:id/optimize",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(req, shipment);
      const updated = await optimizeStoredShipment(
        shipment,
        "FLEET_RECALCULATION",
      );
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "SHIPMENT_ROUTE_OPTIMIZED",
          entityType: "Shipment",
          entityId: shipment._id,
          metadata: {
            distance: updated.distance,
            trigger: updated.routeOptimization?.trigger,
          },
        },
        "audit",
      );
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/dispatch",
    requireAuth,
    allowRoles("logistics_partner", "logistics"),
    validate(shipmentDispatchSchema),
    asyncHandler(async (req, res) => {
      const [shipment, vehicle, users] = await Promise.all([
        store.get("shipments", req.params.id),
        store.get("vehicles", req.body.vehicleId),
        store.list("users"),
      ]);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      if (!vehicle) throw new HttpError(404, "Vehicle not found");
      if (
        !["AVAILABLE", "IDLE"].includes(vehicle.status) &&
        vehicle.shipmentId !== shipment._id
      )
        throw new HttpError(
          409,
          "This vehicle is already assigned or unavailable",
        );
      if (Number(vehicle.capacity) < Number(shipment.load))
        throw new HttpError(
          409,
          `Vehicle capacity is ${vehicle.capacity}kg, below this ${shipment.load}kg load`,
        );
      if (shipment.coldChainRequired && !vehicle.coldChain)
        throw new HttpError(
          409,
          "Choose a cold-chain vehicle for this shipment",
        );
      const activeFleetPartners = users.filter(
        (user) =>
          user.role === "logistics_partner" &&
          accountStatusOf(user) === "ACTIVE",
      );
      const fleetPartner =
        activeFleetPartners.find((user) => user._id === req.user.sub) ||
        activeFleetPartners.find(
          (user) => user._id === vehicle.fleetPartnerUserId,
        ) ||
        activeFleetPartners[0];
      const activeDrivers = users.filter(
        (user) => user.role === "driver" && accountStatusOf(user) === "ACTIVE",
      );
      const driver =
        activeDrivers.find(
          (user) =>
            user._id === vehicle.driverUserId &&
            (!user.currentShipmentId ||
              user.currentShipmentId === shipment._id),
        ) ||
        activeDrivers.find(
          (user) =>
            !user.currentShipmentId || user.currentShipmentId === shipment._id,
        );
      if (!fleetPartner)
        throw new HttpError(
          409,
          "No active verified fleet partner is available for this vehicle",
        );
      if (!driver)
        throw new HttpError(
          409,
          "No active verified driver is available for this vehicle",
        );
      if (shipment.vehicleId && shipment.vehicleId !== vehicle._id)
        await store.update("vehicles", shipment.vehicleId, {
          status: "AVAILABLE",
          shipmentId: null,
        });
      await store.update("vehicles", vehicle._id, {
        status: "ASSIGNED",
        shipmentId: shipment._id,
      });
      await store.update("users", driver._id, {
        currentShipmentId: shipment._id,
      });
      const assigned = await store.update("shipments", shipment._id, {
        vehicleId: vehicle._id,
        vehicle: `${vehicle.registration} · ${vehicle.type}`,
        fleetPartnerUserId: fleetPartner._id,
        fleetPartner: fleetPartner.name,
        driverUserId: driver._id,
        driver: driver.name,
        phone: fleetPartner.phone
          ? `•••• ${String(fleetPartner.phone).slice(-4)}`
          : "Protected",
        capacity: vehicle.capacity,
        coldChain: Boolean(vehicle.coldChain),
        status: "READY_FOR_PICKUP",
        dispatchRequired: false,
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: req.user.sub,
        timeline: [
          ...(shipment.timeline || []),
          "Vehicle, fleet partner and driver auto-dispatched",
        ],
      });
      const updated = await optimizeStoredShipment(assigned, "FLEET_DISPATCH");
      await Promise.all([
        store.create(
          "notifications",
          {
            userId: fleetPartner._id,
            title: "Fleet trip dispatched to you",
            message: `${updated.load}kg · ${updated.stops.length} stops · next: ${updated.nextStop?.label}.`,
            type: "SHIPMENT_ASSIGNED",
            entityId: updated._id,
            read: false,
          },
          "note",
        ),
        store.create(
          "notifications",
          {
            userId: driver._id,
            title: "Trip assigned to you",
            message: `${updated.load}kg · ${updated.stops.length} stops · next: ${updated.nextStop?.label}.`,
            type: "SHIPMENT_ASSIGNED",
            entityId: updated._id,
            read: false,
          },
          "note",
        ),
        store.create(
          "auditLogs",
          {
            actorId: req.user.sub,
            action: "SHIPMENT_AUTO_DISPATCHED",
            entityType: "Shipment",
            entityId: updated._id,
            metadata: {
              vehicleId: vehicle._id,
              fleetPartnerId: fleetPartner._id,
              driverId: driver._id,
              distance: updated.distance,
            },
          },
          "audit",
        ),
      ]);
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/start",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(
        req,
        shipment,
        "Fleet partners can start only their assigned shipments",
      );
      if (
        (!shipment.fleetPartnerUserId && !shipment.driverUserId) ||
        (!shipment.vehicleId && shipment.dispatchRequired)
      )
        throw new HttpError(
          409,
          "An assigned driver or fleet partner and vehicle must be assigned before starting",
        );
      if (shipment.status === "DELIVERED")
        throw new HttpError(409, "This shipment is already delivered");
      const prepared =
        shipment.routeOptimization?.version === 2
          ? shipment
          : await optimizeStoredShipment(shipment, "TRIP_START");
      const updated = await store.update("shipments", shipment._id, {
        status: "IN_TRANSIT",
        startedAt: prepared.startedAt || new Date().toISOString(),
        timeline: [
          ...(prepared.timeline || []),
          `${req.user.role === "driver" ? "Driver" : "Fleet partner"} started optimized trip`,
        ],
      });
      await markOrdersInTransit(req, updated);
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "SHIPMENT_TRIP_STARTED",
          entityType: "Shipment",
          entityId: shipment._id,
          metadata: { nextStop: updated.nextStop?.label },
        },
        "audit",
      );
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/location",
    requireAuth,
    allowRoles("driver"),
    validate(shipmentLocationSchema),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(req, shipment);
      if (!["IN_TRANSIT", "PICKED_UP"].includes(shipment.status))
        throw new HttpError(409, "Start the trip before sharing live location");
      const timestamp = new Date().toISOString();
      const coordinates = [req.body.longitude, req.body.latitude];
      const estimate = await liveRouteEstimate(coordinates, shipment.stops);
      const completedStops = (shipment.stops || []).filter(
        (stop) => stop.status === "COMPLETED",
      ).length;
      const totalStops = shipment.stops?.length || 0;
      const progressPercent = totalStops
        ? Math.round((completedStops / totalStops) * 100)
        : 0;
      const estimatedArrival = estimate?.remainingDuration
        ? new Date(
            Date.now() + estimate.remainingDuration * 60_000,
          ).toISOString()
        : shipment.estimatedArrival || null;
      const updated = await store.update("shipments", shipment._id, {
        liveLocation: {
          coordinates,
          speedKph: req.body.speedKph ?? null,
          heading: req.body.heading ?? null,
          updatedAt: timestamp,
          source: "DRIVER_GPS",
        },
        routeProgress: {
          completedStops,
          totalStops,
          progressPercent,
          updatedAt: timestamp,
        },
        remainingDistance:
          estimate?.remainingDistance ?? shipment.remainingDistance ?? null,
        remainingDuration:
          estimate?.remainingDuration ?? shipment.remainingDuration ?? null,
        estimatedArrival,
        liveRouteProvider:
          estimate?.provider ||
          shipment.liveRouteProvider ||
          "Latest driver location",
      });
      emit(req, "shipment:locationUpdated", updated);
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/stops/:stop/complete",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    validate(shipmentStopSchema),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(
        req,
        shipment,
        "Fleet partners can update only their assigned shipments",
      );
      const prepared =
        shipment.routeOptimization?.version === 2
          ? shipment
          : await optimizeStoredShipment(shipment, "STOP_WORKFLOW_OPENED");
      const targetIndex = prepared.stops.findIndex(
        (stop) =>
          stop.id === req.params.stop ||
          String(stop.sequence) === req.params.stop,
      );
      if (targetIndex < 0) throw new HttpError(404, "Route stop not found");
      const target = prepared.stops[targetIndex];
      if (target.status === "COMPLETED")
        throw new HttpError(409, "This route stop is already complete");
      if (target.status !== "NEXT")
        throw new HttpError(
          409,
          `Complete ${prepared.nextStop?.label || "the next stop"} first`,
        );
      const stops = prepared.stops.map((stop, index) =>
        index === targetIndex
          ? {
              ...stop,
              status: "COMPLETED",
              completedAt: new Date().toISOString(),
              completedBy: req.user.sub,
              completedQuantity: req.body.quantity ?? stop.quantity,
              completionNotes: req.body.notes,
            }
          : stop,
      );
      const allComplete = stops.every((stop) => stop.status === "COMPLETED");
      const advanced = await store.update("shipments", shipment._id, {
        stops,
        status: allComplete ? "DELIVERED" : "IN_TRANSIT",
        deliveredAt: allComplete ? new Date().toISOString() : undefined,
        timeline: [
          ...(prepared.timeline || []),
          `${target.type.toLowerCase()} completed · ${target.label}`,
        ],
      });
      const updated = allComplete
        ? advanced
        : await optimizeStoredShipment(advanced, "STOP_COMPLETED");
      if (!allComplete) await markOrdersInTransit(req, updated);
      if (allComplete) {
        if (updated.vehicleId)
          await store.update("vehicles", updated.vehicleId, {
            status: "AVAILABLE",
            shipmentId: null,
          });
        if (updated.fleetPartnerUserId)
          await store.update("users", updated.fleetPartnerUserId, {
            currentShipmentId: null,
          });
        if (updated.driverUserId)
          await store.update("users", updated.driverUserId, {
            currentShipmentId: null,
          });
        await markOrdersDelivered(req, updated);
      }
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "SHIPMENT_STOP_COMPLETED",
          entityType: "Shipment",
          entityId: shipment._id,
          metadata: {
            stopType: target.type,
            stopLabel: target.label,
            allComplete,
          },
        },
        "audit",
      );
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/issues",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    validate(shipmentIssueSchema),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(
        req,
        shipment,
        "Fleet partners can report issues only for their assigned shipments",
      );
      const issue = {
        id: id("issue"),
        ...req.body,
        reportedBy: req.user.sub,
        reportedAt: new Date().toISOString(),
        status: "OPEN",
      };
      const updated = await store.update("shipments", shipment._id, {
        issues: [...(shipment.issues || []), issue],
        status: "DELAYED",
        timeline: [
          ...(shipment.timeline || []),
          `${req.body.severity.toLowerCase()} ${req.body.type.toLowerCase()} issue reported`,
        ],
      });
      const dispatchers = (await store.list("users")).filter(
        (user) =>
          ["logistics_partner", "logistics"].includes(user.role) &&
          accountStatusOf(user) === "ACTIVE" &&
          user._id !== req.user.sub,
      );
      await Promise.all([
        ...dispatchers.map((dispatcher) =>
          store.create(
            "notifications",
            {
              userId: dispatcher._id,
              title: `${req.body.severity} shipment issue`,
              message: `${shipment._id}: ${req.body.message}`,
              type: "SHIPMENT_ISSUE",
              entityId: shipment._id,
              read: false,
            },
            "note",
          ),
        ),
        store.create(
          "auditLogs",
          {
            actorId: req.user.sub,
            action: "SHIPMENT_ISSUE_REPORTED",
            entityType: "Shipment",
            entityId: shipment._id,
            metadata: {
              issueId: issue.id,
              type: issue.type,
              severity: issue.severity,
            },
          },
          "audit",
        ),
      ]);
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.post(
    "/shipments/:id/proof-of-pickup",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(
        req,
        shipment,
        "Fleet partners can update only their assigned shipments",
      );
      const completedAt = new Date().toISOString();
      const stops = shipment.stops.map((stop) =>
        stop.type === "PICKUP"
          ? {
              ...stop,
              status: "COMPLETED",
              completedAt,
              completedBy: req.user.sub,
            }
          : stop,
      );
      const updated = await store.update("shipments", req.params.id, {
        status: "PICKED_UP",
        stops,
        proofOfPickup: {
          timestamp: new Date().toISOString(),
          receiverName: req.body.receiverName,
          quantity: req.body.quantity,
          notes: req.body.notes,
        },
      });
      const optimized = await optimizeStoredShipment(
        updated,
        "PROOF_OF_PICKUP",
      );
      await markOrdersInTransit(req, optimized);
      emit(req, "shipment:statusChanged", optimized);
      ok(res, optimized);
    }),
  );
  router.post(
    "/shipments/:id/proof-of-delivery",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics"),
    asyncHandler(async (req, res) => {
      const shipment = await store.get("shipments", req.params.id);
      if (!shipment) throw new HttpError(404, "Shipment not found");
      assertShipmentAccess(
        req,
        shipment,
        "Fleet partners can update only their assigned shipments",
      );
      const completedAt = new Date().toISOString();
      const updated = await store.update("shipments", req.params.id, {
        status: "DELIVERED",
        stops: shipment.stops.map((stop) =>
          stop.type === "DELIVERY"
            ? {
                ...stop,
                status: "COMPLETED",
                completedAt,
                completedBy: req.user.sub,
              }
            : stop,
        ),
        deliveredAt: completedAt,
        proofOfDelivery: {
          timestamp: new Date().toISOString(),
          receiverName: req.body.receiverName,
          acceptedQuantity: req.body.acceptedQuantity,
          rejectedQuantity: req.body.rejectedQuantity || 0,
          notes: req.body.notes,
        },
      });
      if (updated.vehicleId)
        await store.update("vehicles", updated.vehicleId, {
          status: "AVAILABLE",
          shipmentId: null,
        });
      if (updated.fleetPartnerUserId)
        await store.update("users", updated.fleetPartnerUserId, {
          currentShipmentId: null,
        });
      if (updated.driverUserId)
        await store.update("users", updated.driverUserId, {
          currentShipmentId: null,
        });
      await markOrdersDelivered(req, updated);
      emit(req, "shipment:statusChanged", updated);
      ok(res, updated);
    }),
  );
  router.get(
    "/hubs",
    asyncHandler(async (_req, res) => ok(res, await store.list("hubs"))),
  );
  router.get(
    "/vehicles",
    requireAuth,
    allowRoles("driver", "logistics_partner", "logistics", "admin"),
    asyncHandler(async (req, res) =>
      ok(
        res,
        await store.list(
          "vehicles",
          req.user.role === "driver" ? { driverUserId: req.user.sub } : {},
        ),
      ),
    ),
  );
}
