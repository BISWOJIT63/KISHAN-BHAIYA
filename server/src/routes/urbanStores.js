import { z } from "zod";
import { store } from "../services/dataStore.js";
import { optimizeStoredShipment } from "../services/shipmentRouting.js";
import { providers } from "../providers/index.js";
import { buildSeedData } from "../seed/data.js";
import { allowRoles, requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, HttpError, ok } from "../utils/http.js";

const retailBuyerOnly = allowRoles("consumer");

const storeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        inventoryId: z.string().min(2),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1)
    .max(30),
  deliveryAddress: z.string().trim().min(5).max(300),
  deliveryCoordinates: z
    .tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)])
    .optional(),
  paymentMethod: z.enum(["COD", "UPI"]).default("COD"),
});

const inventoryUpdateSchema = z
  .object({
    stock: z.coerce.number().min(0).optional(),
    price: z.coerce.number().positive().optional(),
    status: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide an inventory change",
  );

const orderStatusSchema = z.object({
  status: z.enum(["PACKING", "READY_FOR_PICKUP"]),
});

const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);
const accountStatusOf = (user) =>
  user?.accountStatus || (user?.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");
const maskIdentifier = (value) => {
  const compact = String(value || "").replace(/\s+/g, "");
  return compact ? `•••• ${compact.slice(-4)}` : "";
};

function distanceKm(from, to) {
  if (!Array.isArray(from) || !Array.isArray(to)) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const [fromLng, fromLat] = from.map(Number);
  const [toLng, toLat] = to.map(Number);
  const latitudeDelta = radians(toLat - fromLat);
  const longitudeDelta = radians(toLng - fromLng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(fromLat)) *
      Math.cos(radians(toLat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return Number(
    (6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1),
  );
}

async function enrichedStoreInventory(urbanStore, inventories, products) {
  const productById = new Map(
    products.map((product) => [product._id, product]),
  );
  return inventories
    .filter((item) => item.storeId === urbanStore._id)
    .map((item) => ({ ...item, product: productById.get(item.productId) }))
    .filter((item) => item.product);
}

function validateRequestedLine(requested, inventoryById, productById) {
  const inventory = inventoryById.get(requested.inventoryId);
  const product = inventory && productById.get(inventory.productId);
  if (!inventory || !product || inventory.status === "OUT_OF_STOCK") {
    throw new HttpError(400, "One or more store items are unavailable");
  }

  const quantity = Number(requested.quantity);
  const minimum = Number(inventory.minimumQuantity || 1);
  const step = Number(inventory.quantityStep || minimum);
  if (
    quantity < minimum ||
    Math.abs(quantity / step - Math.round(quantity / step)) > 0.0001
  ) {
    throw new HttpError(
      400,
      `${product.name} must be ordered in ${step}${product.unit} steps`,
    );
  }
  if (quantity > Number(inventory.stock || 0)) {
    throw new HttpError(
      409,
      `${product.name} has only ${inventory.stock}${product.unit} available at this store`,
    );
  }

  const lineTotal = Number((Number(inventory.price) * quantity).toFixed(2));
  const marketPrice = Number(inventory.marketPrice || product.retailPrice);
  return {
    inventory,
    load: product.unit === "piece" ? quantity * 1.2 : quantity,
    savings: Math.max(0, marketPrice - Number(inventory.price)) * quantity,
    line: {
      inventoryId: inventory._id,
      productId: product._id,
      name: product.name,
      image: product.image,
      quantity,
      unit: product.unit,
      price: inventory.price,
      marketPrice,
      lineTotal,
      storeId: inventory.storeId,
      approvalStatus: "ACCEPTED",
    },
  };
}

function selectDeliveryTeam({ users, shipments, vehicles, totalLoad }) {
  const activeDriverIds = new Set(
    shipments
      .filter(
        (shipment) => !["DELIVERED", "CANCELLED"].includes(shipment.status),
      )
      .map((shipment) => shipment.driverUserId)
      .filter(Boolean),
  );
  const urbanVehicle = vehicles.find(
    (candidate) =>
      candidate.status === "AVAILABLE" &&
      candidate.serviceType === "URBAN_STORE" &&
      Number(candidate.capacity || 0) >= totalLoad,
  );
  const preferredDriverId = urbanVehicle?.driverUserId;
  const driver = users.find(
    (user) =>
      user.role === "driver" &&
      accountStatusOf(user) === "ACTIVE" &&
      !activeDriverIds.has(user._id) &&
      (!preferredDriverId || user._id === preferredDriverId),
  );
  const vehicle =
    urbanVehicle ||
    vehicles.find(
      (candidate) =>
        candidate.status === "AVAILABLE" &&
        (!driver ||
          !candidate.driverUserId ||
          candidate.driverUserId === driver._id) &&
        Number(candidate.capacity || 0) >= totalLoad,
    );
  return { driver, vehicle };
}

async function updateInventoryAfterCheckout(lines, inventoryById, session) {
  for (const line of lines) {
    const inventory = inventoryById.get(line.inventoryId);
    const remaining = Number(
      (Number(inventory.stock) - line.quantity).toFixed(2),
    );
    const lowStockLimit = Math.max(
      5,
      Number(inventory.minimumQuantity || 1) * 8,
    );
    await store.update(
      "storeInventories",
      inventory._id,
      {
        stock: remaining,
        status:
          remaining <= 0
            ? "OUT_OF_STOCK"
            : remaining <= lowStockLimit
              ? "LOW_STOCK"
              : "IN_STOCK",
      },
      session,
    );
  }
}

async function createExpressOrder(req) {
  return store.transaction(async (session) => {
    const [
      urbanStore,
      buyer,
      allInventory,
      products,
      users,
      shipments,
      vehicles,
    ] = await Promise.all([
      store.get("urbanStores", req.params.id, session),
      store.get("users", req.user.sub, session),
      store.list("storeInventories", { storeId: req.params.id }, session),
      store.list("products", {}, session),
      store.list("users", {}, session),
      store.list("shipments", {}, session),
      store.list("vehicles", {}, session),
    ]);
    if (!urbanStore || urbanStore.status !== "OPEN") {
      throw new HttpError(409, "This urban store is not accepting orders");
    }

    const inventoryById = new Map(allInventory.map((item) => [item._id, item]));
    const productById = new Map(
      products.map((product) => [product._id, product]),
    );
    const requestedLines = req.body.items.map((item) =>
      validateRequestedLine(item, inventoryById, productById),
    );
    const lines = requestedLines.map((item) => item.line);
    const subtotal = Number(
      lines.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );
    const savings = Number(
      requestedLines.reduce((sum, item) => sum + item.savings, 0).toFixed(2),
    );
    const totalLoad = Number(
      requestedLines.reduce((sum, item) => sum + item.load, 0).toFixed(2),
    );
    if (req.user.role === "business_buyer") {
      throw new HttpError(
        403,
        "Business buyers procure in bulk quantities directly from farmers and FPOs. Please use the Bulk Procurement portal.",
      );
    }

    const deliveryCoordinates = req.body.deliveryCoordinates ||
      buyer?.locationCoordinates || [85.8245, 20.2961];
    const calculatedDistance = distanceKm(
      deliveryCoordinates,
      urbanStore.coordinates,
    );
    if (calculatedDistance !== null && calculatedDistance > 20) {
      throw new HttpError(
        400,
        `Delivery is only available within a 20 km radius of ${urbanStore.name}. Your delivery location is ${calculatedDistance} km away.`,
      );
    }

    let deliveryFee = 20;
    if (calculatedDistance !== null) {
      if (calculatedDistance < 5) {
        deliveryFee = subtotal >= 299 ? 0 : 20;
      } else if (calculatedDistance <= 10) {
        deliveryFee = 40;
      } else if (calculatedDistance <= 15) {
        deliveryFee = 65;
      } else {
        deliveryFee = 95;
      }
    } else {
      deliveryFee = subtotal >= 299 ? 0 : 20;
    }
    const handlingFee = 5;
    const { driver, vehicle } = selectDeliveryTeam({
      users,
      shipments,
      vehicles,
      totalLoad,
    });
    const estimatedAt = new Date(
      Date.now() + Number(urbanStore.estimatedDeliveryMinutes || 30) * 60_000,
    ).toISOString();

    const order = await store.create(
      "orders",
      {
        buyerId: req.user.sub,
        storeId: urbanStore._id,
        storeName: urbanStore.name,
        storeOwnershipType: urbanStore.ownershipType,
        type: "STORE_EXPRESS",
        status: "PACKING",
        items: lines,
        subtotal,
        savings,
        deliveryFee,
        handlingFee,
        total: Number((subtotal + deliveryFee + handlingFee).toFixed(2)),
        paymentStatus:
          req.body.paymentMethod === "COD" ? "COD_PENDING" : "PAID_MOCK",
        paymentProvider: providers.payment.name,
        deliveryAddress: req.body.deliveryAddress,
        deliveryCoordinates,
        deliveryDate: estimatedAt,
        estimatedMinutes: urbanStore.estimatedDeliveryMinutes,
      },
      "store-order",
      session,
    );
    const shipment = await store.create(
      "shipments",
      {
        orderIds: [order._id],
        storeId: urbanStore._id,
        source: "URBAN_STORE",
        type: "STORE_LAST_MILE",
        status: driver && vehicle ? "READY_FOR_PICKUP" : "PLANNED",
        dispatchRequired: !(driver && vehicle),
        driverUserId: driver?._id || null,
        driver: driver?.name || "Awaiting driver assignment",
        vehicleId: vehicle?._id || null,
        vehicle: vehicle
          ? `${vehicle.registration} · ${vehicle.type}`
          : "Awaiting vehicle assignment",
        fleetPartnerUserId: vehicle?.fleetPartnerUserId || null,
        fleetPartner: driver?.organization || "Urban delivery pool",
        phone: driver?.phone ? maskIdentifier(driver.phone) : "",
        capacity: vehicle?.capacity || Math.max(50, Math.ceil(totalLoad)),
        load: totalLoad,
        utilization: vehicle
          ? Math.round((totalLoad / vehicle.capacity) * 100)
          : 100,
        coldChain: Boolean(vehicle?.coldChain),
        estimatedArrival: estimatedAt,
        stops: [
          {
            id: `${order._id}-pickup`,
            type: "PICKUP",
            label: urbanStore.name,
            coordinates: urbanStore.coordinates,
            status: "PENDING",
            quantity: totalLoad,
            unit: "kg",
          },
          {
            id: `${order._id}-delivery`,
            type: "DELIVERY",
            label: req.body.deliveryAddress,
            coordinates: deliveryCoordinates,
            status: "PENDING",
            quantity: totalLoad,
            unit: "kg",
          },
        ],
        timeline: [
          "Urban store order confirmed",
          driver && vehicle
            ? "Driver and vehicle assigned automatically"
            : "Awaiting fleet assignment",
        ],
      },
      "store-trip",
      session,
    );

    await store.update(
      "orders",
      order._id,
      { shipmentId: shipment._id },
      session,
    );
    await updateInventoryAfterCheckout(lines, inventoryById, session);
    if (driver) {
      await store.update(
        "users",
        driver._id,
        { currentShipmentId: shipment._id },
        session,
      );
    }
    if (vehicle) {
      await store.update(
        "vehicles",
        vehicle._id,
        {
          status: "ASSIGNED",
          shipmentId: shipment._id,
          driverUserId: driver?._id || vehicle.driverUserId,
        },
        session,
      );
    }
    return {
      order: { ...order, shipmentId: shipment._id },
      shipment,
      urbanStore,
      driver,
    };
  });
}

async function notifyExpressOrder(req, result) {
  await Promise.all([
    store.create(
      "notifications",
      {
        userId: req.user.sub,
        title: "Express store order confirmed",
        message: `${result.urbanStore.name} is packing your order for delivery in about ${result.urbanStore.estimatedDeliveryMinutes} minutes.`,
        type: "STORE_ORDER_CONFIRMED",
        entityId: result.order._id,
        actionPath: `/orders/${result.order._id}`,
        read: false,
      },
      "note",
    ),
    result.driver
      ? store.create(
          "notifications",
          {
            userId: result.driver._id,
            title: "New urban store delivery",
            message: `Pickup from ${result.urbanStore.name} and deliver order ${result.order._id}.`,
            type: "STORE_TRIP_ASSIGNED",
            entityId: result.shipment._id,
            actionPath: `/shipments/${result.shipment._id}`,
            read: false,
          },
          "note",
        )
      : Promise.resolve(),
    store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "STORE_EXPRESS_ORDER_CREATED",
        entityType: "Order",
        entityId: result.order._id,
        metadata: {
          storeId: result.urbanStore._id,
          shipmentId: result.shipment._id,
          savings: result.order.savings,
        },
      },
      "audit",
    ),
  ]);
}

export function registerUrbanStoreRoutes(router) {
  router.get(
    "/urban-stores",
    optionalAuth,
    asyncHandler(async (req, res) => {
      const user = req.user?.sub
        ? await store.get("users", req.user.sub)
        : null;
      const queryCoordinates =
        req.query.longitude && req.query.latitude
          ? [Number(req.query.longitude), Number(req.query.latitude)]
          : null;
      // Default to Patia, Bhubaneswar [85.8254, 20.3547] if coordinates are not provided
      const buyerCoordinates = queryCoordinates ||
        user?.locationCoordinates || [85.8254, 20.3547];
      let [urbanStores, inventories, products] = await Promise.all([
        store.list("urbanStores"),
        store.list("storeInventories"),
        store.list("products"),
      ]);
      if (!urbanStores || !urbanStores.length) {
        const seedData = buildSeedData();
        urbanStores = seedData.urbanStores || [];
        inventories = seedData.storeInventories || [];
        products = seedData.products || [];
      }
      const result = await Promise.all(
        urbanStores.map(async (urbanStore) => {
          const inventory = (
            await enrichedStoreInventory(urbanStore, inventories, products)
          ).filter(
            (item) => item.status !== "OUT_OF_STOCK" && Number(item.stock) > 0,
          );
          const calculatedDistance = distanceKm(
            buyerCoordinates,
            urbanStore.coordinates,
          );
          const maxRadius = Math.min(
            20,
            Number(urbanStore.serviceRadiusKm || 20),
          );
          return {
            ...urbanStore,
            serviceRadiusKm: maxRadius,
            distanceKm: calculatedDistance,
            serviceable:
              calculatedDistance === null ||
              (calculatedDistance <= maxRadius && calculatedDistance <= 20),
            inventory,
            availableItems: inventory.length,
          };
        }),
      );
      ok(
        res,
        result.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)),
      );
    }),
  );

  router.get(
    "/urban-stores/:id",
    optionalAuth,
    asyncHandler(async (req, res) => {
      let urbanStore = await store.get("urbanStores", req.params.id);
      let [inventories, products] = await Promise.all([
        store.list("storeInventories", { storeId: req.params.id }),
        store.list("products"),
      ]);
      if (!urbanStore) {
        const seedData = buildSeedData();
        urbanStore = (seedData.urbanStores || []).find(
          (s) => s._id === req.params.id,
        );
        inventories = (seedData.storeInventories || []).filter(
          (i) => i.storeId === req.params.id,
        );
        products = seedData.products || [];
      }
      if (!urbanStore) {
        throw new HttpError(404, "Urban store not found");
      }
      ok(res, {
        ...urbanStore,
        inventory: await enrichedStoreInventory(
          urbanStore,
          inventories,
          products,
        ),
      });
    }),
  );

  router.post(
    "/urban-stores/:id/orders",
    requireAuth,
    retailBuyerOnly,
    validate(storeOrderSchema),
    asyncHandler(async (req, res) => {
      const result = await createExpressOrder(req);
      result.shipment = await optimizeStoredShipment(
        result.shipment,
        "STORE_ORDER_CREATED",
      );
      await notifyExpressOrder(req, result);
      emit(req, "order:statusChanged", result.order);
      emit(req, "shipment:statusChanged", result.shipment);
      ok(res, result);
    }),
  );

  router.get(
    "/store-operations",
    requireAuth,
    allowRoles("admin"),
    asyncHandler(async (_req, res) => {
      const [urbanStores, inventory, products, orders] = await Promise.all([
        store.list("urbanStores"),
        store.list("storeInventories"),
        store.list("products"),
        store.list("orders"),
      ]);
      const storeById = new Map(urbanStores.map((item) => [item._id, item]));
      const productById = new Map(products.map((item) => [item._id, item]));
      ok(res, {
        stores: urbanStores,
        inventory: inventory.map((item) => ({
          ...item,
          storeName: storeById.get(item.storeId)?.name || item.storeId,
          productName: productById.get(item.productId)?.name || item.productId,
          unit: productById.get(item.productId)?.unit || "kg",
        })),
        orders: orders.filter((order) => order.type === "STORE_EXPRESS"),
      });
    }),
  );

  router.patch(
    "/store-operations/inventory/:id",
    requireAuth,
    allowRoles("admin"),
    validate(inventoryUpdateSchema),
    asyncHandler(async (req, res) => {
      const inventory = await store.get("storeInventories", req.params.id);
      if (!inventory) {
        throw new HttpError(404, "Store inventory item not found");
      }
      const changes = { ...req.body };
      if (changes.stock === 0) changes.status = "OUT_OF_STOCK";
      else if (changes.stock > 0 && !changes.status) {
        changes.status = changes.stock <= 5 ? "LOW_STOCK" : "IN_STOCK";
      }
      const updated = await store.update(
        "storeInventories",
        inventory._id,
        changes,
      );
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "STORE_INVENTORY_UPDATED",
          entityType: "StoreInventory",
          entityId: updated._id,
          metadata: changes,
        },
        "audit",
      );
      ok(res, updated);
    }),
  );

  router.patch(
    "/store-operations/orders/:id/status",
    requireAuth,
    allowRoles("admin"),
    validate(orderStatusSchema),
    asyncHandler(async (req, res) => {
      const order = await store.get("orders", req.params.id);
      if (!order || order.type !== "STORE_EXPRESS") {
        throw new HttpError(404, "Store order not found");
      }
      const updated = await store.update("orders", order._id, {
        status: req.body.status,
        storeUpdatedAt: new Date().toISOString(),
      });
      if (order.shipmentId) {
        const shipment = await store.get("shipments", order.shipmentId);
        await store.update("shipments", order.shipmentId, {
          status:
            req.body.status === "READY_FOR_PICKUP"
              ? "READY_FOR_PICKUP"
              : "PLANNED",
          timeline: [
            ...(shipment?.timeline || []),
            `Store marked order ${req.body.status.toLowerCase().replaceAll("_", " ")}`,
          ],
        });
      }
      emit(req, "order:statusChanged", updated);
      ok(res, updated);
    }),
  );
}
