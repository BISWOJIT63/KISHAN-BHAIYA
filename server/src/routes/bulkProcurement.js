import { z } from "zod";
import { nanoid } from "nanoid";
import { store } from "../services/dataStore.js";
import { buildFulfillmentPlan, scoreCandidates } from "../services/matching.js";
import { buildShipmentDrafts } from "../services/fulfillmentPlanner.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, HttpError, ok } from "../utils/http.js";

const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);
const id = (prefix) => `${prefix}-${nanoid(8)}`;

const requirementSchema = z.object({
  product: z.string().min(2),
  productId: z.string().optional(),
  category: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string().default("kg"),
  quality: z.string().min(1),
  targetPrice: z.coerce.number().positive().optional(),
  requiredDate: z.string(),
  location: z.string().min(2),
  allowPartial: z.boolean().default(true),
  minFillPercent: z.coerce.number().min(1).max(100).default(80),
  packaging: z.string().optional(),
  transport: z.string().optional(),
  recurring: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});
const quotationSchema = z.object({
  quantity: z.coerce.number().positive(),
  pricePerUnit: z.coerce.number().positive(),
  deliveryDate: z.string(),
  transportCost: z.coerce.number().min(0).default(0),
  transportIncluded: z.boolean().default(false),
  paymentTerms: z.string().min(2),
  packaging: z.string().optional(),
  validUntil: z.string(),
  note: z.string().max(1000).optional(),
});
const counterSchema = z.object({
  pricePerUnit: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  deliveryDate: z.string(),
  transportCost: z.coerce.number().min(0),
  paymentTerms: z.string().min(2),
  message: z.string().max(1000).optional(),
});

export function registerBulkProcurementRoutes(router) {
  router.get(
    "/bulk-requirements",
    requireAuth,
    allowRoles("business_buyer", "farmer", "fpo_manager", "admin"),
    asyncHandler(async (req, res) => {
      const [requirements, quotations, orders] = await Promise.all([
        store.list("requirements"),
        store.list("quotations"),
        store.list("orders"),
      ]);
      const activeDemandStatuses = new Set([
        "OPEN",
        "QUOTES_RECEIVED",
        "NEGOTIATING",
      ]);
      const fulfilledRequirementIds = new Set([
        ...quotations
          .filter((quote) => quote.status === "ACCEPTED")
          .map((quote) => quote.requirementId),
        ...orders
          .filter(
            (order) =>
              order.requirementId && !["CANCELLED"].includes(order.status),
          )
          .map((order) => order.requirementId),
      ]);
      ok(
        res,
        req.user.role === "business_buyer"
          ? requirements.filter((r) => r.buyerId === req.user.sub)
          : req.user.role === "admin"
            ? requirements
            : requirements.filter(
                (r) =>
                  activeDemandStatuses.has(r.status) &&
                  !fulfilledRequirementIds.has(r._id),
              ),
      );
    }),
  );
  router.post(
    "/bulk-requirements",
    requireAuth,
    allowRoles("business_buyer"),
    validate(requirementSchema),
    asyncHandler(async (req, res) => {
      const requirement = await store.create(
        "requirements",
        {
          ...req.body,
          buyerId: req.user.sub,
          buyer: req.user.name,
          status: "OPEN",
          quotationsCount: 0,
          coordinates: [85.8245, 20.2961],
        },
        "req",
      );
      emit(req, "notification:new", { type: "REQUIREMENT", requirement });
      ok(res, requirement);
    }),
  );
  router.get(
    "/bulk-requirements/:id",
    requireAuth,
    allowRoles("business_buyer", "admin"),
    asyncHandler(async (req, res) => {
      const requirement = await store.get("requirements", req.params.id);
      if (!requirement) throw new HttpError(404, "Requirement not found");
      if (req.user.role !== "admin" && requirement.buyerId !== req.user.sub)
        throw new HttpError(
          403,
          "Only the requirement owner can view procurement details",
        );
      const [requirementOrders, requirementQuotes] = await Promise.all([
        store.list("orders", { requirementId: requirement._id }),
        store.list("quotations", { requirementId: requirement._id }),
      ]);
      const acceptedOrder =
        requirementOrders.find((order) => order.status !== "CANCELLED") || null;
      const fulfilled =
        Boolean(acceptedOrder) ||
        requirementQuotes.some((quote) => quote.status === "ACCEPTED");
      ok(
        res,
        acceptedOrder
          ? {
              ...requirement,
              status: "ACCEPTED",
              acceptedOrderId: acceptedOrder._id,
              acceptedAt: requirement.acceptedAt || acceptedOrder.createdAt,
              acceptedSplitSummary: acceptedOrder.splitSummary,
            }
          : fulfilled
            ? { ...requirement, status: "ACCEPTED" }
            : requirement,
      );
    }),
  );
  router.get(
    "/bulk-requirements/:id/matches",
    requireAuth,
    allowRoles("business_buyer", "admin"),
    asyncHandler(async (req, res) => {
      const requirement = await store.get("requirements", req.params.id);
      if (!requirement) throw new HttpError(404, "Requirement not found");
      if (req.user.role !== "admin" && requirement.buyerId !== req.user.sub)
        throw new HttpError(
          403,
          "Only the requirement owner can view supplier matches",
        );
      const candidates = scoreCandidates(
        requirement,
        await store.list("products"),
        await store.list("lots"),
      );
      ok(res, {
        candidates,
        plan: buildFulfillmentPlan(requirement, candidates),
      });
    }),
  );
  router.post(
    "/bulk-requirements/:id/fulfillment-plans/accept",
    requireAuth,
    allowRoles("business_buyer"),
    asyncHandler(async (req, res) => {
      const result = await store.transaction(async (session) => {
        const requirement = await store.get(
          "requirements",
          req.params.id,
          session,
        );
        if (!requirement) throw new HttpError(404, "Requirement not found");
        if (req.user.role !== "admin" && requirement.buyerId !== req.user.sub)
          throw new HttpError(
            403,
            "Only the requirement owner can accept this plan",
          );
        if (["ACCEPTED", "PARTIALLY_FILLED"].includes(requirement.status)) {
          const existingOrder = await store.find(
            "orders",
            {
              requirementId: requirement._id,
              type: "BULK_MULTI_SELLER",
            },
            session,
          );
          if (!existingOrder)
            throw new HttpError(
              409,
              "This fulfillment plan has already been accepted",
            );
          const suborders = await store.list(
            "subFulfillments",
            { orderId: existingOrder._id },
            session,
          );
          const shipmentIds = existingOrder.shipmentIds?.length
            ? existingOrder.shipmentIds
            : existingOrder.shipmentId
              ? [existingOrder.shipmentId]
              : [];
          const shipments = (
            await Promise.all(
              shipmentIds.map((shipmentId) =>
                store.get("shipments", shipmentId, session),
              ),
            )
          ).filter(Boolean);
          return {
            ...existingOrder,
            suborders,
            shipments,
            idempotentReplay: true,
          };
        }
        const candidates = scoreCandidates(
          requirement,
          await store.list("products", {}, session),
          await store.list("lots", {}, session),
        );
        const plan = buildFulfillmentPlan(requirement, candidates);
        const requiredCoverage =
          requirement.allowPartial === false ? 100 : requirement.minFillPercent;
        if (plan.coveragePercent < requiredCoverage)
          throw new HttpError(
            409,
            `Current plan covers ${plan.coveragePercent}%, below your ${requiredCoverage}% minimum`,
          );
        const order = await store.create(
          "orders",
          {
            buyerId: req.user.sub,
            type: "BULK_MULTI_SELLER",
            requirementId: requirement._id,
            status: "CONFIRMED",
            paymentStatus: "PAYMENT_DUE",
            total: plan.estimatedLandedTotal,
            items: [
              {
                productId: requirement.productId,
                name: requirement.product,
                quantity: plan.filledQuantity,
                unit: requirement.unit,
              },
            ],
            fulfillmentPlan: {
              coveragePercent: plan.coveragePercent,
              method: plan.method,
              requestedQuantity: plan.requestedQuantity,
              filledQuantity: plan.filledQuantity,
              missingQuantity: plan.missingQuantity,
              supplierCount: plan.supplierCount,
              splitRequired: plan.splitRequired,
              allocations: plan.allocations.map((allocation) => ({
                sellerId: allocation.sellerId,
                sellerName: allocation.seller?.name,
                quantity: allocation.quantity,
                allocationPercent: allocation.allocationPercent,
                pricePerUnit: allocation.price,
                subtotal: allocation.subtotal,
                estimatedTransport: allocation.estimatedTransport,
                splitReason: allocation.splitReason,
              })),
            },
          },
          "order",
          session,
        );
        const suborders = [];
        const shipmentAllocations = [];
        const sellers = await store.list("sellers", {}, session);
        for (const allocation of plan.allocations) {
          let remaining = allocation.quantity;
          const lotAllocations = [];
          const lots = (
            await store.list("lots", { sellerId: allocation.sellerId }, session)
          )
            .filter(
              (l) =>
                l.productId === requirement.productId &&
                l.availableQuantity > 0,
            )
            .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
          for (const lot of lots) {
            const qty = Math.min(remaining, lot.availableQuantity);
            if (!qty) continue;
            await store.update(
              "lots",
              lot._id,
              { availableQuantity: lot.availableQuantity - qty },
              session,
            );
            lotAllocations.push({
              lotId: lot._id,
              lotCode: lot.lotCode,
              quantity: qty,
              expiryDate: lot.expiryDate,
              coldChainRequired: Boolean(lot.coldChainRequired),
            });
            remaining -= qty;
            if (!remaining) break;
          }
          if (remaining > 0)
            throw new HttpError(
              409,
              `Supplier inventory changed; ${remaining}${requirement.unit} could not be reserved`,
            );
          const seller =
            sellers.find((candidate) => candidate.id === allocation.sellerId) ||
            allocation.seller;
          const suborder = await store.create(
            "subFulfillments",
            {
              orderId: order._id,
              sellerId: allocation.sellerId,
              sellerName: seller?.name,
              quantity: allocation.quantity,
              unit: requirement.unit,
              allocationPercent: allocation.allocationPercent,
              pricePerUnit: allocation.price,
              subtotal: allocation.subtotal,
              estimatedTransport: allocation.estimatedTransport,
              lotAllocations,
              status: "RESERVED",
            },
            "suborder",
            session,
          );
          suborders.push(suborder);
          shipmentAllocations.push({
            ...allocation,
            seller,
            coordinates: seller?.coordinates || allocation.coordinates,
            subFulfillmentId: suborder._id,
            coldChainRequired: lotAllocations.some(
              (lot) => lot.coldChainRequired,
            ),
          });
          if (seller?.userId)
            await store.create(
              "notifications",
              {
                userId: seller.userId,
                title: "Bulk allocation reserved",
                message: `${allocation.quantity}${requirement.unit} of ${requirement.product} was allocated to your farm for order ${order._id}.`,
                type: "BULK_ALLOCATION",
                entityId: suborder._id,
                read: false,
              },
              "note",
              session,
            );
        }
        const [vehicles, users, hubs] = await Promise.all([
          store.list("vehicles", {}, session),
          store.list("users", {}, session),
          store.list("hubs", {}, session),
        ]);
        const shipmentDrafts = buildShipmentDrafts({
          orderId: order._id,
          requirement,
          allocations: shipmentAllocations,
          vehicles,
          drivers: users,
          fleetPartners: users,
          hubs,
        });
        const shipments = [];
        for (const draft of shipmentDrafts) {
          const shipment = await store.create(
            "shipments",
            draft,
            "ship",
            session,
          );
          shipments.push(shipment);
          if (shipment.vehicleId)
            await store.update(
              "vehicles",
              shipment.vehicleId,
              { status: "ASSIGNED", shipmentId: shipment._id },
              session,
            );
          if (shipment.fleetPartnerUserId) {
            await store.update(
              "users",
              shipment.fleetPartnerUserId,
              { currentShipmentId: shipment._id },
              session,
            );
            await store.create(
              "notifications",
              {
                userId: shipment.fleetPartnerUserId,
                title: "New optimized trip assigned",
                message: `${shipment.load}${requirement.unit} · ${shipment.stops.length} stops · next: ${shipment.nextStop?.label || "open trip"}.`,
                type: "SHIPMENT_ASSIGNED",
                entityId: shipment._id,
                read: false,
              },
              "note",
              session,
            );
          }
          if (shipment.driverUserId) {
            await store.update(
              "users",
              shipment.driverUserId,
              { currentShipmentId: shipment._id },
              session,
            );
          }
        }
        const updatedOrder = await store.update(
          "orders",
          order._id,
          {
            shipmentId: shipments[0]?._id || null,
            shipmentIds: shipments.map((shipment) => shipment._id),
            splitSummary: {
              supplierCount: suborders.length,
              shipmentCount: shipments.length,
              autoDispatchedCount: shipments.filter(
                (shipment) => !shipment.dispatchRequired,
              ).length,
              allocations: suborders.map((suborder) => ({
                subFulfillmentId: suborder._id,
                sellerId: suborder.sellerId,
                sellerName: suborder.sellerName,
                quantity: suborder.quantity,
                allocationPercent: suborder.allocationPercent,
                status: suborder.status,
              })),
            },
          },
          session,
        );
        await store.update(
          "requirements",
          requirement._id,
          {
            status:
              plan.coveragePercent === 100 ? "ACCEPTED" : "PARTIALLY_FILLED",
            acceptedOrderId: updatedOrder._id,
            acceptedAt: new Date().toISOString(),
            acceptedSplitSummary: updatedOrder.splitSummary,
          },
          session,
        );
        await store.create(
          "auditLogs",
          {
            actorId: req.user.sub,
            action: "MULTI_SELLER_PLAN_ACCEPTED",
            entityType: "BulkRequirement",
            entityId: requirement._id,
            metadata: {
              orderId: updatedOrder._id,
              suborders: suborders.map((s) => s._id),
              shipments: shipments.map((shipment) => shipment._id),
              automaticSplit: true,
            },
          },
          "audit",
          session,
        );
        return { ...updatedOrder, suborders, shipments };
      });
      emit(req, "order:statusChanged", result);
      ok(res, result);
    }),
  );
  router.get(
    "/bulk-requirements/:id/quotations",
    requireAuth,
    allowRoles("business_buyer", "admin"),
    asyncHandler(async (req, res) => {
      const requirement = await store.get("requirements", req.params.id);
      if (!requirement) throw new HttpError(404, "Requirement not found");
      if (req.user.role !== "admin" && requirement.buyerId !== req.user.sub)
        throw new HttpError(
          403,
          "Only the requirement owner can compare quotations",
        );
      ok(res, await store.list("quotations", { requirementId: req.params.id }));
    }),
  );
  router.post(
    "/bulk-requirements/:id/quotations",
    requireAuth,
    allowRoles("farmer", "fpo_manager"),
    validate(quotationSchema),
    asyncHandler(async (req, res) => {
      const requirement = await store.get("requirements", req.params.id);
      if (!requirement) throw new HttpError(404, "Requirement not found");
      if (
        !["OPEN", "QUOTES_RECEIVED", "NEGOTIATING"].includes(requirement.status)
      )
        throw new HttpError(
          409,
          "This demand has already been fulfilled and is closed for quotations",
        );
      const [existingQuotes, existingOrders] = await Promise.all([
        store.list("quotations", { requirementId: requirement._id }),
        store.list("orders", { requirementId: requirement._id }),
      ]);
      if (
        existingQuotes.some((quote) => quote.status === "ACCEPTED") ||
        existingOrders.some((order) => order.status !== "CANCELLED")
      )
        throw new HttpError(
          409,
          "This demand has already been fulfilled and is closed for quotations",
        );
      const sellers = await store.list("sellers");
      const seller = sellers.find((s) => s.userId === req.user.sub) || {
        id: req.user.sub,
        name: req.user.name,
        type: req.user.role === "fpo_manager" ? "FPO" : "Farmer",
        rating: 5,
        reliability: 100,
      };
      const quote = await store.create(
        "quotations",
        {
          ...req.body,
          requirementId: requirement._id,
          sellerId: seller.id,
          seller,
          status: "SENT",
        },
        "quote",
      );
      await store.update("requirements", requirement._id, {
        status: "QUOTES_RECEIVED",
        quotationsCount: (requirement.quotationsCount || 0) + 1,
      });
      emit(req, "quotation:new", quote);
      ok(res, quote);
    }),
  );

  router.get(
    "/quotations/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const quote = await store.get("quotations", req.params.id);
      if (!quote) throw new HttpError(404, "Quotation not found");
      const requirement = await store.get("requirements", quote.requirementId);
      const seller = await store.find("sellers", { id: quote.sellerId });
      if (
        req.user.role !== "admin" &&
        requirement.buyerId !== req.user.sub &&
        seller?.userId !== req.user.sub
      )
        throw new HttpError(403, "You do not have access to this quotation");
      const negotiation = await store.find("negotiations", {
        quotationId: quote._id,
      });
      ok(res, { quote, negotiation, requirement });
    }),
  );
  router.post(
    "/quotations/:id/counter",
    requireAuth,
    allowRoles("business_buyer", "farmer", "fpo_manager"),
    validate(counterSchema),
    asyncHandler(async (req, res) => {
      const quote = await store.get("quotations", req.params.id);
      if (!quote) throw new HttpError(404, "Quotation not found");
      const requirement = await store.get("requirements", quote.requirementId);
      const seller = await store.find("sellers", { id: quote.sellerId });
      if (
        req.user.role !== "admin" &&
        requirement.buyerId !== req.user.sub &&
        seller?.userId !== req.user.sub
      )
        throw new HttpError(403, "Only quotation participants can counter");
      let negotiation = await store.find("negotiations", {
        quotationId: quote._id,
      });
      const requirementQuotes = await store.list("quotations", {
        requirementId: requirement._id,
      });
      if (
        quote.status === "ACCEPTED" ||
        negotiation?.status === "ACCEPTED" ||
        requirementQuotes.some((item) => item.status === "ACCEPTED") ||
        ["ACCEPTED", "PARTIALLY_FILLED", "CLOSED"].includes(requirement.status)
      )
        throw new HttpError(
          409,
          "This offer has been accepted or closed and can no longer be countered",
        );
      const offer = {
        id: id("offer"),
        sender: req.user.name,
        senderRole: ["farmer", "fpo_manager"].includes(req.user.role)
          ? "seller"
          : "buyer",
        ...req.body,
        createdAt: new Date().toISOString(),
        current: true,
      };
      if (!negotiation)
        negotiation = await store.create(
          "negotiations",
          { quotationId: quote._id, status: "ACTIVE", offers: [offer] },
          "neg",
        );
      else {
        const offers = negotiation.offers.map((o) => ({
          ...o,
          current: false,
        }));
        negotiation = await store.update("negotiations", negotiation._id, {
          offers: [...offers, offer],
          status: "ACTIVE",
        });
      }
      await store.update("quotations", quote._id, { status: "NEGOTIATING" });
      emit(req, "negotiation:countered", { quotationId: quote._id, offer });
      ok(res, negotiation);
    }),
  );
  router.post(
    "/quotations/:id/accept",
    requireAuth,
    allowRoles("business_buyer"),
    asyncHandler(async (req, res) => {
      const result = await store.transaction(async (session) => {
        const quote = await store.get("quotations", req.params.id, session);
        if (!quote) throw new HttpError(404, "Quotation not found");
        if (quote.status === "ACCEPTED")
          throw new HttpError(409, "This quotation is already accepted");
        const requirement = await store.get(
          "requirements",
          quote.requirementId,
          session,
        );
        if (
          ["ACCEPTED", "PARTIALLY_FILLED", "CLOSED"].includes(
            requirement.status,
          )
        )
          throw new HttpError(
            409,
            "This demand has already been fulfilled with another offer",
          );
        const [existingOrders, existingQuotes] = await Promise.all([
          store.list("orders", { requirementId: requirement._id }, session),
          store.list("quotations", { requirementId: requirement._id }, session),
        ]);
        if (
          existingOrders.some((order) => order.status !== "CANCELLED") ||
          existingQuotes.some(
            (candidate) =>
              candidate._id !== quote._id && candidate.status === "ACCEPTED",
          )
        )
          throw new HttpError(
            409,
            "This demand has already been fulfilled with another offer",
          );
        if (req.user.role !== "admin" && requirement.buyerId !== req.user.sub)
          throw new HttpError(
            403,
            "Only the requirement owner can accept this quotation",
          );
        const negotiation = await store.find(
          "negotiations",
          { quotationId: quote._id },
          session,
        );
        const terms = negotiation?.offers?.at(-1) || quote;
        const lots = (
          await store.list("lots", { sellerId: quote.sellerId }, session)
        )
          .filter(
            (l) =>
              l.productId === requirement.productId && l.availableQuantity > 0,
          )
          .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        const available = lots.reduce((n, l) => n + l.availableQuantity, 0);
        if (available < terms.quantity)
          throw new HttpError(
            409,
            `Only ${available}${requirement.unit} is currently reservable from this seller`,
          );
        let remaining = terms.quantity;
        for (const lot of lots) {
          const allocated = Math.min(remaining, lot.availableQuantity);
          if (allocated) {
            await store.update(
              "lots",
              lot._id,
              { availableQuantity: lot.availableQuantity - allocated },
              session,
            );
            remaining -= allocated;
          }
          if (!remaining) break;
        }
        const total =
          terms.pricePerUnit * terms.quantity + (terms.transportCost || 0);
        const order = await store.create(
          "orders",
          {
            buyerId: req.user.sub,
            sellerId: quote.sellerId,
            type: "BULK",
            requirementId: requirement._id,
            quotationId: quote._id,
            status: "CONFIRMED",
            paymentStatus: "PAYMENT_DUE",
            total,
            items: [
              {
                productId: requirement.productId,
                name: requirement.product,
                quantity: terms.quantity,
                price: terms.pricePerUnit,
                unit: requirement.unit,
              },
            ],
            acceptedTerms: terms,
          },
          "order",
          session,
        );
        await store.update(
          "quotations",
          quote._id,
          { status: "ACCEPTED" },
          session,
        );
        await store.update(
          "requirements",
          requirement._id,
          { status: "ACCEPTED" },
          session,
        );
        if (negotiation)
          await store.update(
            "negotiations",
            negotiation._id,
            { status: "ACCEPTED" },
            session,
          );
        const competingQuotes = (
          await store.list(
            "quotations",
            { requirementId: requirement._id },
            session,
          )
        ).filter((candidate) => candidate._id !== quote._id);
        await Promise.all(
          competingQuotes.map((candidate) =>
            store.update(
              "quotations",
              candidate._id,
              { status: "CLOSED" },
              session,
            ),
          ),
        );
        const competingNegotiations = await store.list(
          "negotiations",
          {},
          session,
        );
        await Promise.all(
          competingNegotiations
            .filter(
              (candidate) =>
                candidate.quotationId !== quote._id &&
                competingQuotes.some(
                  (quoteItem) => quoteItem._id === candidate.quotationId,
                ),
            )
            .map((candidate) =>
              store.update(
                "negotiations",
                candidate._id,
                { status: "CLOSED" },
                session,
              ),
            ),
        );
        await store.create(
          "auditLogs",
          {
            actorId: req.user.sub,
            action: "QUOTATION_ACCEPTED",
            entityType: "Quotation",
            entityId: quote._id,
            metadata: { orderId: order._id, total },
          },
          "audit",
          session,
        );
        return { quote, order };
      });
      emit(req, "negotiation:accepted", {
        quotationId: result.quote._id,
        order: result.order,
      });
      ok(res, result.order);
    }),
  );
  router.post(
    "/quotations/:id/reject",
    requireAuth,
    allowRoles("business_buyer", "farmer", "fpo_manager"),
    asyncHandler(async (req, res) => {
      const existing = await store.get("quotations", req.params.id);
      if (!existing) throw new HttpError(404, "Quotation not found");
      const requirement = await store.get(
        "requirements",
        existing.requirementId,
      );
      const seller = await store.find("sellers", { id: existing.sellerId });
      if (
        req.user.role !== "admin" &&
        requirement.buyerId !== req.user.sub &&
        seller?.userId !== req.user.sub
      )
        throw new HttpError(403, "Only quotation participants can reject");
      if (["ACCEPTED", "CLOSED", "REJECTED"].includes(existing.status))
        throw new HttpError(409, "This quotation is already closed");
      const quote = await store.update("quotations", req.params.id, {
        status: "REJECTED",
      });
      const negotiation = await store.find("negotiations", {
        quotationId: quote._id,
      });
      if (negotiation)
        await store.update("negotiations", negotiation._id, {
          status: "REJECTED",
        });
      emit(req, "quotation:updated", quote);
      ok(res, quote);
    }),
  );
}
