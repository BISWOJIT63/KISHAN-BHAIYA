import { beforeAll, describe, expect, it } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { createApp } from "../app.js";
import { store } from "../services/dataStore.js";
import { buildSeedData, demoPassword } from "../seed/data.js";
import { buildFulfillmentPlan, scoreCandidates } from "../services/matching.js";
import { optimizeRoute } from "../services/routeOptimizer.js";
import { buildShipmentDrafts } from "../services/fulfillmentPlanner.js";
import {
  evaluateLoadOpportunity,
  mergeAcceptedLoad,
} from "../services/loadSharing.js";
import { reverseIndiaLocation } from "../services/geocoding.js";

beforeAll(async () => store.initialize("memory"));

describe("matching engine", () => {
  it("explains and completes a multi-seller tomato plan", () => {
    const data = buildSeedData(),
      requirement = data.requirements[0];
    const candidates = scoreCandidates(requirement, data.products, data.lots);
    const plan = buildFulfillmentPlan(requirement, candidates);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[0].explanation).toContain("fulfillment reliability");
    expect(plan.coveragePercent).toBeGreaterThanOrEqual(
      requirement.minFillPercent,
    );
    expect(plan.allocations.length).toBeGreaterThan(1);
  });
});

describe("route optimizer", () => {
  it("keeps all stops and reports labelled estimate assumptions", () => {
    const shipment = buildSeedData().shipments[1];
    const result = optimizeRoute(shipment.stops, {
      capacity: shipment.capacity,
      load: shipment.load,
    });
    expect(result.stops).toHaveLength(shipment.stops.length);
    expect(result.distance).toBeGreaterThan(0);
    expect(result.provider).toContain("estimate");
    expect(result.utilization).toBe(67);
    expect(result.routeOptimization.version).toBe(2);
    expect(result.nextStop.status).toBe("NEXT");
    expect(
      result.stops.findIndex((stop) => stop.type === "DELIVERY"),
    ).toBeGreaterThan(result.stops.findIndex((stop) => stop.type === "PICKUP"));
  });
});

describe("automatic fulfillment logistics", () => {
  it("splits supplier allocations into capacity-safe, pickup-first trips", () => {
    const data = buildSeedData();
    const requirement = data.requirements[0];
    const plan = buildFulfillmentPlan(
      requirement,
      scoreCandidates(requirement, data.products, data.lots),
    );
    const allocations = plan.allocations.map((allocation, index) => ({
      ...allocation,
      subFulfillmentId: `sub-${index}`,
      coordinates: allocation.seller?.coordinates,
    }));
    const drafts = buildShipmentDrafts({
      orderId: "order-test",
      requirement,
      allocations,
      vehicles: data.vehicles,
      fleetPartners: data.users,
      hubs: data.hubs,
    });
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.reduce((total, draft) => total + draft.load, 0)).toBe(
      plan.filledQuantity,
    );
    expect(drafts.every((draft) => draft.load <= draft.capacity)).toBe(true);
    expect(
      drafts.every(
        (draft) => draft.routeOptimization.trigger === "BULK_SPLIT_CREATED",
      ),
    ).toBe(true);
    expect(
      drafts.every(
        (draft) =>
          draft.stops.findIndex((stop) => stop.type === "DELIVERY") >
          draft.stops.findIndex((stop) => stop.type === "PICKUP"),
      ),
    ).toBe(true);
    const coldAllocations = allocations.map((allocation, index) => ({
      ...allocation,
      coldChainRequired: index === 0,
    }));
    const ambientOnly = buildShipmentDrafts({
      orderId: "order-cold-test",
      requirement,
      allocations: coldAllocations,
      vehicles: data.vehicles.filter(
        (vehicle) => vehicle.status === "AVAILABLE" && !vehicle.coldChain,
      ),
      fleetPartners: data.users,
      hubs: data.hubs,
    });
    expect(ambientOnly[0].dispatchRequired).toBe(true);
    expect(ambientOnly[0].status).toBe("PLANNED");
    expect(ambientOnly[0].routeOptimization.warnings).toContain(
      "Cold-chain vehicle required before dispatch",
    );
  });
});

describe("in-transit load sharing", () => {
  it("fits a compatible load into spare capacity and re-optimizes after acceptance", () => {
    const data = buildSeedData();
    const active = {
      ...data.shipments.find((shipment) => shipment._id === "ship-fleet-demo"),
      status: "IN_TRANSIT",
    };
    const candidate = data.shipments.find(
      (shipment) => shipment._id === "ship-load-demo",
    );
    const evaluation = evaluateLoadOpportunity(active, candidate);
    expect(evaluation).toEqual(
      expect.objectContaining({
        compatible: true,
        addedLoad: 180,
        remainingCapacity: 280,
        spareCapacityAfter: 100,
        utilizationAfter: 89,
      }),
    );
    expect(
      evaluation.route.stops.findIndex(
        (stop) =>
          stop.sourceShipmentId === "ship-load-demo" && stop.type === "PICKUP",
      ),
    ).toBeLessThan(
      evaluation.route.stops.findIndex(
        (stop) =>
          stop.sourceShipmentId === "ship-load-demo" &&
          stop.type === "DELIVERY",
      ),
    );
    const offered = {
      ...active,
      loadOffers: [
        {
          id: "load-offer-test",
          candidateShipmentId: candidate._id,
          status: "PENDING_FLEET",
        },
      ],
    };
    const merged = mergeAcceptedLoad(offered, candidate, "load-offer-test", {
      sub: "user-fleet",
      role: "logistics_partner",
    }).shipment;
    expect(merged.load).toBe(800);
    expect(merged.orderIds).toContain("order-load-demo");
    expect(merged.routeOptimization.trigger).toBe("IN_TRANSIT_LOAD_ACCEPTED");
    expect(merged.loadOffers[0].status).toBe("ACCEPTED");
  });
  it("rejects loads that exceed capacity or require an unavailable cold chain", () => {
    const data = buildSeedData();
    const active = {
      ...data.shipments.find((shipment) => shipment._id === "ship-fleet-demo"),
      status: "IN_TRANSIT",
    };
    const candidate = data.shipments.find(
      (shipment) => shipment._id === "ship-load-demo",
    );
    expect(
      evaluateLoadOpportunity(active, { ...candidate, load: 300 }).compatible,
    ).toBe(false);
    const cold = evaluateLoadOpportunity(active, {
      ...candidate,
      coldChainRequired: true,
    });
    expect(cold.compatible).toBe(false);
    expect(cold.reasons).toContain("Cold-chain requirement is not compatible");
  });
});

describe("India-wide location resolution", () => {
  it("keeps exact GPS coordinates and has an honest nationwide offline fallback", async () => {
    const location = await reverseIndiaLocation(12.9716, 77.5946, {
      online: false,
    });
    expect(location).toEqual(
      expect.objectContaining({
        label: "Bengaluru, Karnataka",
        coordinates: [77.5946, 12.9716],
        country: "India",
        approximate: true,
      }),
    );
    await expect(
      reverseIndiaLocation(1.3521, 103.8198, { online: false }),
    ).rejects.toThrow("outside the supported India service boundary");
  });
});

describe("critical API path", () => {
  const app = createApp();
  let token,
    farmerToken,
    fpoToken,
    logisticsToken,
    buyerToken,
    adminToken,
    driverToken,
    fleetToken,
    bulkOrder;
  it("resolves a GPS point anywhere inside India without authentication", async () => {
    const resolved = await request(app).get(
      "/api/v1/locations/reverse?latitude=12.9716&longitude=77.5946",
    );
    expect(resolved.status).toBe(200);
    expect(resolved.body.data).toEqual(
      expect.objectContaining({
        label: "Bengaluru, Karnataka",
        coordinates: [77.5946, 12.9716],
      }),
    );
    const outside = await request(app).get(
      "/api/v1/locations/reverse?latitude=1.3521&longitude=103.8198",
    );
    expect(outside.status).toBe(400);
  });
  it("logs in with a documented development account", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: "consumer@kishanbhaiya.demo",
        password: demoPassword,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("consumer");
    token = response.body.data.accessToken;
  });
  it("provides an active fleet-partner demo account", async () => {
    const [driverLogin, fleetLogin] = await Promise.all([
      request(app)
        .post("/api/v1/auth/login")
        .send({
          identifier: "driver.active@kishanbhaiya.demo",
          password: demoPassword,
        }),
      request(app)
        .post("/api/v1/auth/login")
        .send({
          identifier: "fleet@kishanbhaiya.demo",
          password: demoPassword,
        }),
    ]);
    expect(driverLogin.status).toBe(200);
    expect(driverLogin.body.data.user).toEqual(
      expect.objectContaining({ role: "driver", accountStatus: "ACTIVE" }),
    );
    expect(fleetLogin.status).toBe(200);
    expect(fleetLogin.body.data.user).toEqual(
      expect.objectContaining({
        role: "logistics_partner",
        accountStatus: "ACTIVE",
      }),
    );
    driverToken = driverLogin.body.data.accessToken;
    fleetToken = fleetLogin.body.data.accessToken;
    const fleetShipments = await request(app)
      .get("/api/v1/shipments")
      .set("Authorization", `Bearer ${fleetToken}`);
    const driverShipments = await request(app)
      .get("/api/v1/shipments")
      .set("Authorization", `Bearer ${driverToken}`);
    expect(fleetShipments.body.data).toContainEqual(
      expect.objectContaining({
        _id: "ship-fleet-demo",
        fleetPartnerUserId: "user-fleet",
      }),
    );
    expect(driverShipments.body.data).toEqual([
      expect.objectContaining({
        _id: "ship-driver-demo",
        driverUserId: "user-driver",
      }),
    ]);
    const assigned = fleetShipments.body.data.find(
      (shipment) => shipment._id === "ship-fleet-demo",
    );
    expect(assigned.routeOptimization.version).toBe(2);
    expect(assigned.nextStop.type).toBe("PICKUP");
  });
  it("calculates an order total on the server", async () => {
    const before = await store.get("products", "prod-tomato");
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ productId: "prod-tomato", quantity: 2 }],
        paymentMethod: "UPI",
        deliveryAddress: "Demo address",
        deliverySlot: "Tomorrow",
      });
    expect(response.status).toBe(200);
    expect(response.body.data.subtotal).toBe(before.retailPrice * 2);
    expect(response.body.data.paymentProvider).toBe("Mock payment provider");
  });
  it("creates a small-quantity urban store order and assigns it to a driver trip", async () => {
    const nearby = await request(app)
      .get("/api/v1/urban-stores")
      .set("Authorization", `Bearer ${token}`);
    expect(nearby.status).toBe(200);
    expect(nearby.body.data).toContainEqual(
      expect.objectContaining({
        ownershipType: "GOVERNMENT",
        serviceable: true,
      }),
    );
    expect(nearby.body.data).toContainEqual(
      expect.objectContaining({ ownershipType: "FRANCHISE" }),
    );
    const urbanStore = nearby.body.data[0],
      stock = urbanStore.inventory[0];
    const placed = await request(app)
      .post(`/api/v1/urban-stores/${urbanStore._id}/orders`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [{ inventoryId: stock._id, quantity: stock.minimumQuantity }],
        deliveryAddress: "Patia apartment, Bhubaneswar",
        deliveryCoordinates: [85.8245, 20.2961],
        paymentMethod: "COD",
      });
    expect(placed.status).toBe(200);
    expect(placed.body.data.order).toEqual(
      expect.objectContaining({
        type: "STORE_EXPRESS",
        storeId: urbanStore._id,
        status: "PACKING",
      }),
    );
    expect(placed.body.data.shipment).toEqual(
      expect.objectContaining({
        type: "STORE_LAST_MILE",
        source: "URBAN_STORE",
        driverUserId: expect.any(String),
        vehicleId: expect.any(String),
      }),
    );
    const assignedDriver = await store.get(
      "users",
      placed.body.data.shipment.driverUserId,
    );
    const driverLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: assignedDriver.email, password: demoPassword });
    const trips = await request(app)
      .get("/api/v1/shipments")
      .set("Authorization", `Bearer ${driverLogin.body.data.accessToken}`);
    expect(trips.body.data).toContainEqual(
      expect.objectContaining({
        _id: placed.body.data.shipment._id,
        storeId: urbanStore._id,
      }),
    );
  });
  it("returns useful related products and a public-safe seller profile", async () => {
    const related = await request(app).get(
      "/api/v1/products/prod-tomato/related?limit=4",
    );
    expect(related.status).toBe(200);
    expect(related.body.data).toHaveLength(4);
    expect(
      related.body.data.some((product) => product._id === "prod-tomato"),
    ).toBe(false);
    expect(related.body.meta.basis).toContain("Same category");
    const profile = await request(app).get("/api/v1/sellers/seller-2");
    expect(profile.status).toBe(200);
    expect(profile.body.data.seller.name).toBe("Utkal Harvest FPO");
    expect(profile.body.data.seller.userId).toBeUndefined();
    expect(
      profile.body.data.products.every(
        (product) => product.sellerId === "seller-2",
      ),
    ).toBe(true);
    expect(profile.body.data.trust.privateContactHidden).toBe(true);
  });
  it("keeps retail checkout consumer-only and sends business buyers through bulk procurement", async () => {
    const farmerLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "farmer@kishanbhaiya.demo", password: demoPassword });
    const logisticsLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: "logistics@kishanbhaiya.demo",
        password: demoPassword,
      });
    const fpoLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "fpo@kishanbhaiya.demo", password: demoPassword });
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin@kishanbhaiya.demo", password: demoPassword });
    const buyerLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "buyer@kishanbhaiya.demo", password: demoPassword });
    farmerToken = farmerLogin.body.data.accessToken;
    fpoToken = fpoLogin.body.data.accessToken;
    logisticsToken = logisticsLogin.body.data.accessToken;
    buyerToken = buyerLogin.body.data.accessToken;
    const farmerOrder = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({
        items: [{ productId: "prod-onion", quantity: 1 }],
        paymentMethod: "COD",
        deliveryAddress: "Khordha demo address",
        deliverySlot: "Tomorrow",
      });
    const logisticsOrder = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${logisticsToken}`)
      .send({
        items: [{ productId: "prod-onion", quantity: 1 }],
        paymentMethod: "COD",
        deliveryAddress: "Operations address",
        deliverySlot: "Tomorrow",
      });
    const fpoOrder = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${fpoLogin.body.data.accessToken}`)
      .send({
        items: [{ productId: "prod-onion", quantity: 1 }],
        paymentMethod: "COD",
        deliveryAddress: "FPO address",
        deliverySlot: "Tomorrow",
      });
    const adminOrder = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${adminLogin.body.data.accessToken}`)
      .send({
        items: [{ productId: "prod-onion", quantity: 1 }],
        paymentMethod: "COD",
        deliveryAddress: "Admin address",
        deliverySlot: "Tomorrow",
      });
    const buyerOrder = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        items: [{ productId: "prod-onion", quantity: 1 }],
        paymentMethod: "COD",
        deliveryAddress: "Business buyer address",
        deliverySlot: "Tomorrow",
      });
    const buyerStoreOrder = await request(app)
      .post("/api/v1/urban-stores/store-govt-bbsr/orders")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        items: [{ inventoryId: "inventory-placeholder", quantity: 1 }],
        deliveryAddress: "Business buyer address",
        paymentMethod: "COD",
      });
    expect([
      farmerOrder.status,
      logisticsOrder.status,
      fpoOrder.status,
      adminOrder.status,
      buyerOrder.status,
      buyerStoreOrder.status,
    ]).toEqual([403, 403, 403, 403, 403, 403]);
  });
  it("separates buyer, producer and logistics data and actions", async () => {
    const [
      consumerBootstrap,
      farmerBootstrap,
      logisticsBootstrap,
      buyerRequirements,
      farmerShipments,
      farmerFpoMembers,
      farmerOrders,
      logisticsOrders,
      logisticsRequirements,
      consumerAnalytics,
    ] = await Promise.all([
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${token}`),
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${logisticsToken}`),
      request(app)
        .get("/api/v1/bulk-requirements")
        .set("Authorization", `Bearer ${buyerToken}`),
      request(app)
        .get("/api/v1/shipments")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/fpo/members")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/orders")
        .set("Authorization", `Bearer ${logisticsToken}`),
      request(app)
        .get("/api/v1/bulk-requirements")
        .set("Authorization", `Bearer ${logisticsToken}`),
      request(app)
        .get("/api/v1/analytics/overview")
        .set("Authorization", `Bearer ${token}`),
    ]);
    expect(consumerBootstrap.body.data.requirements).toEqual([]);
    expect(consumerBootstrap.body.data.shipments).toEqual([]);
    expect(farmerBootstrap.body.data.requirements.length).toBeGreaterThan(0);
    expect(farmerBootstrap.body.data.shipments).toEqual([]);
    expect(
      farmerBootstrap.body.data.expectedHarvests.every(
        (h) => h.sellerId === "seller-1",
      ),
    ).toBe(true);
    expect(logisticsBootstrap.body.data.requirements).toEqual([]);
    expect(logisticsBootstrap.body.data.shipments.length).toBeGreaterThan(0);
    expect(
      buyerRequirements.body.data.every((r) => r.buyerId === "user-business"),
    ).toBe(true);
    expect([
      farmerShipments.status,
      farmerFpoMembers.status,
      farmerOrders.status,
      logisticsOrders.status,
      logisticsRequirements.status,
      consumerAnalytics.status,
    ]).toEqual([403, 403, 403, 403, 403, 403]);
  });
  it("returns a producer workspace and analytics only for the signed-in seller activity", async () => {
    const [
      farmerWorkspace,
      fpoWorkspace,
      farmerAnalytics,
      fpoAnalytics,
      farmerOrders,
      fpoOrders,
    ] = await Promise.all([
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${fpoToken}`),
      request(app)
        .get("/api/v1/analytics/overview")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/analytics/overview")
        .set("Authorization", `Bearer ${fpoToken}`),
      request(app)
        .get("/api/v1/seller/orders")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app)
        .get("/api/v1/seller/orders")
        .set("Authorization", `Bearer ${fpoToken}`),
    ]);
    expect(farmerWorkspace.status).toBe(200);
    expect(fpoWorkspace.status).toBe(200);
    expect(farmerWorkspace.body.data.workspace.seller.id).toBe("seller-1");
    expect(fpoWorkspace.body.data.workspace.seller.id).toBe("seller-2");
    expect(
      farmerWorkspace.body.data.products.every(
        (product) => product.sellerId === "seller-1",
      ),
    ).toBe(true);
    expect(
      fpoWorkspace.body.data.products.every(
        (product) => product.sellerId === "seller-2",
      ),
    ).toBe(true);
    expect(
      farmerWorkspace.body.data.lots.every(
        (lot) => lot.sellerId === "seller-1",
      ),
    ).toBe(true);
    expect(
      fpoWorkspace.body.data.lots.every((lot) => lot.sellerId === "seller-2"),
    ).toBe(true);
    expect(
      farmerWorkspace.body.data.products.map((product) => product._id),
    ).not.toEqual(
      fpoWorkspace.body.data.products.map((product) => product._id),
    );
    expect(farmerAnalytics.body.data.orders).toBe(
      farmerWorkspace.body.data.orders.length,
    );
    expect(fpoAnalytics.body.data.orders).toBe(
      fpoWorkspace.body.data.orders.length,
    );
    expect(farmerOrders.status).toBe(200);
    expect(fpoOrders.status).toBe(200);
  });
  it("runs a protected fleet trip workflow in optimized stop order", async () => {
    const optimized = await request(app)
      .post("/api/v1/shipments/ship-fleet-demo/optimize")
      .set("Authorization", `Bearer ${fleetToken}`);
    expect(optimized.status).toBe(200);
    expect(optimized.body.data.routeOptimization.trigger).toBe(
      "FLEET_RECALCULATION",
    );
    const started = await request(app)
      .post("/api/v1/shipments/ship-fleet-demo/start")
      .set("Authorization", `Bearer ${fleetToken}`);
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe("IN_TRANSIT");
    const farmerPool = await request(app)
      .get("/api/v1/shipments/ship-fleet-demo/load-opportunities")
      .set("Authorization", `Bearer ${farmerToken}`);
    expect(farmerPool.status).toBe(403);
    const pool = await request(app)
      .get("/api/v1/shipments/ship-fleet-demo/load-opportunities")
      .set("Authorization", `Bearer ${fleetToken}`);
    expect(pool.status).toBe(200);
    expect(pool.body.data.opportunities).toContainEqual(
      expect.objectContaining({
        candidateShipmentId: "ship-load-demo",
        addedLoad: 180,
        spareCapacityAfter: 100,
      }),
    );
    const proposed = await request(app)
      .post("/api/v1/shipments/ship-fleet-demo/load-offers")
      .set("Authorization", `Bearer ${fleetToken}`)
      .send({ candidateShipmentId: "ship-load-demo" });
    expect(proposed.status).toBe(200);
    expect(proposed.body.data.offer.status).toBe("PENDING_FLEET");
    const accepted = await request(app)
      .post(
        `/api/v1/shipments/ship-fleet-demo/load-offers/${proposed.body.data.offer.id}/respond`,
      )
      .set("Authorization", `Bearer ${fleetToken}`)
      .send({ action: "ACCEPT" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.shipment.load).toBe(800);
    expect(accepted.body.data.shipment.routeOptimization.trigger).toBe(
      "IN_TRANSIT_LOAD_ACCEPTED",
    );
    expect(accepted.body.data.shipment.orderIds).toContain("order-load-demo");
    expect(accepted.body.data.candidate.status).toBe("MERGED_IN_TRANSIT");
    const next = accepted.body.data.shipment.nextStop;
    const completed = await request(app)
      .post(`/api/v1/shipments/ship-fleet-demo/stops/${next.sequence}/complete`)
      .set("Authorization", `Bearer ${fleetToken}`)
      .send({
        quantity: next.quantity || 620,
        notes: "Pickup hand-off counted.",
      });
    expect(completed.status).toBe(200);
    expect(
      completed.body.data.stops.find((stop) => stop.label === next.label)
        .status,
    ).toBe("COMPLETED");
    expect(completed.body.data.nextStop).toBeTruthy();
    const issue = await request(app)
      .post("/api/v1/shipments/ship-fleet-demo/issues")
      .set("Authorization", `Bearer ${fleetToken}`)
      .send({
        type: "TRAFFIC",
        severity: "LOW",
        message: "Slow traffic near the collection hub.",
      });
    expect(issue.status).toBe(200);
    expect(issue.body.data.status).toBe("DELAYED");
    expect(issue.body.data.issues).toHaveLength(1);
  });
  it("rejects an offer once and prevents it from being changed again", async () => {
    const rejected = await request(app)
      .post("/api/v1/quotations/quote-2/reject")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe("REJECTED");
    const retry = await request(app)
      .post("/api/v1/quotations/quote-2/reject")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(retry.status).toBe(409);
  });
  it("accepts a bulk plan as auditable supplier splits and auto-planned trips", async () => {
    const accepted = await request(app)
      .post("/api/v1/bulk-requirements/req-1024/fulfillment-plans/accept")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(accepted.status).toBe(200);
    bulkOrder = accepted.body.data;
    expect(bulkOrder.type).toBe("BULK_MULTI_SELLER");
    expect(bulkOrder.suborders.length).toBeGreaterThan(1);
    expect(bulkOrder.shipments.length).toBeGreaterThan(0);
    expect(
      bulkOrder.suborders.reduce(
        (total, suborder) => total + suborder.quantity,
        0,
      ),
    ).toBe(bulkOrder.fulfillmentPlan.filledQuantity);
    expect(
      bulkOrder.suborders.every(
        (suborder) => suborder.lotAllocations.length > 0,
      ),
    ).toBe(true);
    expect(
      bulkOrder.shipments.every(
        (shipment) =>
          shipment.routeOptimization.trigger === "BULK_SPLIT_CREATED",
      ),
    ).toBe(true);
    const details = await request(app)
      .get(`/api/v1/orders/${bulkOrder._id}`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(details.status).toBe(200);
    expect(details.body.data.suborders).toHaveLength(
      bulkOrder.suborders.length,
    );
    expect(details.body.data.shipments).toHaveLength(
      bulkOrder.shipments.length,
    );
    const replay = await request(app)
      .post("/api/v1/bulk-requirements/req-1024/fulfillment-plans/accept")
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(replay.status).toBe(200);
    expect(replay.body.data._id).toBe(bulkOrder._id);
    expect(replay.body.data.idempotentReplay).toBe(true);
  });
  it("lets fleet control confirm a capacity-compatible automatic dispatch", async () => {
    const shipment = bulkOrder.shipments.find(
      (candidate) => candidate.vehicleId,
    );
    expect(shipment).toBeTruthy();
    const dispatched = await request(app)
      .post(`/api/v1/shipments/${shipment._id}/dispatch`)
      .set("Authorization", `Bearer ${fleetToken}`)
      .send({ vehicleId: shipment.vehicleId });
    expect(dispatched.status).toBe(200);
    expect(dispatched.body.data.status).toBe("READY_FOR_PICKUP");
    expect(dispatched.body.data.routeOptimization.trigger).toBe(
      "FLEET_DISPATCH",
    );
    expect(dispatched.body.data.dispatchRequired).toBe(false);
  });
  it("lets a farmer request FPO membership and only that FPO manager review it", async () => {
    const [fpos, consumerFpos] = await Promise.all([
      request(app)
        .get("/api/v1/fpos")
        .set("Authorization", `Bearer ${farmerToken}`),
      request(app).get("/api/v1/fpos").set("Authorization", `Bearer ${token}`),
    ]);
    expect(fpos.status).toBe(200);
    expect(fpos.body.data).toContainEqual(
      expect.objectContaining({ fpoId: "seller-2", name: "Utkal Harvest FPO" }),
    );
    expect(consumerFpos.status).toBe(403);
    const submitted = await request(app)
      .post("/api/v1/fpo/membership-requests")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({
        fpoId: "seller-2",
        message: "I grow potatoes and seasonal vegetables.",
      });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data).toEqual(
      expect.objectContaining({
        farmerId: "user-farmer",
        fpoId: "seller-2",
        status: "PENDING",
      }),
    );
    const farmerReview = await request(app)
      .patch(`/api/v1/fpo/membership-requests/${submitted.body.data._id}`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ action: "APPROVE" });
    expect(farmerReview.status).toBe(403);
    const managerQueue = await request(app)
      .get("/api/v1/fpo/membership-requests")
      .set("Authorization", `Bearer ${fpoToken}`);
    expect(managerQueue.body.data).toContainEqual(
      expect.objectContaining({
        _id: submitted.body.data._id,
        status: "PENDING",
      }),
    );
    const approved = await request(app)
      .patch(`/api/v1/fpo/membership-requests/${submitted.body.data._id}`)
      .set("Authorization", `Bearer ${fpoToken}`)
      .send({ action: "APPROVE", note: "Farm details reviewed." });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("APPROVED");
    const members = await request(app)
      .get("/api/v1/fpo/members")
      .set("Authorization", `Bearer ${fpoToken}`);
    expect(members.body.data).toContainEqual(
      expect.objectContaining({
        userId: "user-farmer",
        fpoId: "seller-2",
        status: "ACTIVE",
      }),
    );
    const duplicate = await request(app)
      .post("/api/v1/fpo/membership-requests")
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({ fpoId: "seller-2" });
    expect(duplicate.status).toBe(409);
  });
  it("restricts pending applicants and lets an admin approve them with an audit trail", async () => {
    const pendingLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: "pending.farmer@kishanbhaiya.demo",
        password: demoPassword,
      });
    expect(pendingLogin.status).toBe(200);
    expect(pendingLogin.body.data.user.accountStatus).toBe(
      "PENDING_ADMIN_APPROVAL",
    );
    const pendingToken = pendingLogin.body.data.accessToken;
    const [center, browse, blocked] = await Promise.all([
      request(app)
        .get("/api/v1/auth/verification")
        .set("Authorization", `Bearer ${pendingToken}`),
      request(app)
        .get("/api/v1/products")
        .set("Authorization", `Bearer ${pendingToken}`),
      request(app)
        .get("/api/v1/bootstrap")
        .set("Authorization", `Bearer ${pendingToken}`),
    ]);
    expect(center.status).toBe(200);
    expect(center.body.data.profile.overallStatus).toBe(
      "PENDING_ADMIN_APPROVAL",
    );
    expect(browse.status).toBe(200);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("ACCOUNT_NOT_ACTIVE");
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin@kishanbhaiya.demo", password: demoPassword });
    adminToken = adminLogin.body.data.accessToken;
    const queue = await request(app)
      .get("/api/v1/admin/verifications?status=PENDING_ADMIN_APPROVAL")
      .set("Authorization", `Bearer ${adminToken}`);
    const application = queue.body.data.find(
      (item) => item.userId === "user-pending-farmer",
    );
    expect(application).toBeTruthy();
    expect(
      application.documents.every(
        (document) => document.secureFileKey === undefined,
      ),
    ).toBe(true);
    const approved = await request(app)
      .patch(`/api/v1/admin/verifications/${application._id}/review`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        action: "APPROVE",
        note: "Configured identity requirements reviewed.",
      });
    expect(approved.status).toBe(200);
    expect(approved.body.data.applicant.accountStatus).toBe("ACTIVE");
    const operational = await request(app)
      .get("/api/v1/bootstrap")
      .set("Authorization", `Bearer ${pendingToken}`);
    expect(operational.status).toBe(200);
    const audit = await request(app)
      .get("/api/v1/admin/audit")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(
      audit.body.data.some(
        (entry) =>
          entry.action === "VERIFICATION_APPROVE" &&
          entry.entityId === application._id,
      ),
    ).toBe(true);
  });
  it("supports secure document metadata and a request-changes resubmission", async () => {
    const applicantLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        identifier: "pending.fpo@kishanbhaiya.demo",
        password: demoPassword,
      });
    const applicantToken = applicantLogin.body.data.accessToken;
    const center = await request(app)
      .get("/api/v1/auth/verification")
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(center.body.data.user.accountStatus).toBe("CHANGES_REQUESTED");
    const upload = await request(app)
      .post("/api/v1/auth/verification/documents")
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("documentType", "ORGANIZATION_REGISTRATION")
      .attach("document", Buffer.from("%PDF-1.4 fictional verification file"), {
        filename: "registration.pdf",
        contentType: "application/pdf",
      });
    expect(upload.status).toBe(200);
    expect(upload.body.data.secureFileKey).toBeUndefined();
    expect(upload.body.data.status).toBe("PENDING");
    const storedDocument = (
      await store.list("verificationDocuments", { ownerId: "user-pending-fpo" })
    ).find((item) => item._id === upload.body.data._id);
    expect(storedDocument.secureFileKey).toEqual(expect.any(String));
    const submitted = await request(app)
      .post("/api/v1/auth/verification/submit")
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.user.accountStatus).toBe(
      "PENDING_ADMIN_APPROVAL",
    );
    expect(submitted.body.data.profile.resubmissionCount).toBe(1);
    await unlink(
      path.resolve(
        "private-uploads/verification",
        storedDocument.secureFileKey,
      ),
    ).catch(() => {});
  });
  it("does not persist a plaintext password during registration", async () => {
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Fictional Buyer",
        email: "new.business@kishanbhaiya.demo",
        phone: "9876501099",
        password: "StrongPass@2026",
        role: "business_buyer",
        organization: "Demo Procurement Co",
        location: "Puri",
        preferredLanguage: "en",
      });
    expect(registered.status).toBe(200);
    expect(registered.body.data.user.accountStatus).toBe(
      "PENDING_ADMIN_APPROVAL",
    );
    const stored = await store.find("users", {
      email: "new.business@kishanbhaiya.demo",
    });
    expect(stored.passwordHash).toEqual(expect.any(String));
    expect(stored.password).toBeUndefined();
  });
  it("updates profile details and profile images without allowing role changes", async () => {
    const updated = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ananya Profile Test",
        email: "consumer@kishanbhaiya.demo",
        phone: "9876501001",
        organization: "",
        location: "Bengaluru, Karnataka",
        locationCoordinates: [77.5946, 12.9716],
        locationSource: "REVERSE_GEOCODED",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user.name).toBe("Ananya Profile Test");
    expect(updated.body.data.user.location).toBe("Bengaluru, Karnataka");
    expect(updated.body.data.user.locationCoordinates).toEqual([
      77.5946, 12.9716,
    ]);
    expect(updated.body.data.user.role).toBe("consumer");
    expect(updated.body.data.user.passwordHash).toBeUndefined();
    expect(updated.body.data.accessToken).toEqual(expect.any(String));
    const forbiddenField = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ananya Profile Test",
        email: "consumer@kishanbhaiya.demo",
        phone: "9876501001",
        organization: "",
        location: "Puri",
        role: "admin",
      });
    expect(forbiddenField.status).toBe(400);
    const avatar = await request(app)
      .post("/api/v1/auth/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("89504e470d0a1a0a", "hex"), {
        filename: "profile-test.png",
        contentType: "image/png",
      });
    expect(avatar.status).toBe(200);
    expect(avatar.body.data.user.profileImage).toMatch(/\/api\/v1\/files\//);
    const uploadedPath = path.resolve(
      "uploads",
      path.basename(avatar.body.data.user.profileImage),
    );
    const removed = await request(app)
      .delete("/api/v1/auth/me/avatar")
      .set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data.user.profileImage).toBe("");
    await unlink(uploadedPath).catch(() => {});
  });
});
