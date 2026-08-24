import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nanoid } from "nanoid";
import { store } from "../services/dataStore.js";
import { scoreCandidates, buildFulfillmentPlan } from "../services/matching.js";
import { optimizeRoute } from "../services/routeOptimizer.js";
import { buildShipmentDrafts } from "../services/fulfillmentPlanner.js";
import { findLoadOpportunities, mergeAcceptedLoad, evaluateLoadOpportunity } from "../services/loadSharing.js";
import { reverseIndiaLocation } from "../services/geocoding.js";
import { providers } from "../providers/index.js";
import { asyncHandler, HttpError, ok } from "../utils/http.js";
import { env } from "../config/env.js";
import { refreshLotFreshness } from "../jobs/scheduler.js";
import {
  allowRoles,
  requireAuth,
  signAccess,
  signRefresh,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { upload, verificationUpload } from "../middleware/upload.js";

const router = Router();
const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);
const id = (prefix) => `${prefix}-${nanoid(8)}`;
const refreshCookieOptions = {
  httpOnly: true,
  // The frontend and API use different Vercel domains in production, so the
  // refresh cookie must be explicitly cross-site. Local development remains
  // strict enough for http://localhost.
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  secure: env.nodeEnv === "production",
  path: "/api/v1/auth",
};
const accountStatusOf = (user) => user?.accountStatus || (user?.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");
const verificationStatusOf = (user) => user?.verificationStatus || (user?.verified ? "APPROVED" : "PENDING");
const cleanUser = (user) => {
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.refreshTokenHash;
  delete safe.password;
  safe.accountStatus = accountStatusOf(user);
  safe.verificationStatus = verificationStatusOf(user);
  return safe;
};
const cleanVerificationDocument = ({ secureFileKey: _secureFileKey, ...document }) => document;
const sellerForUser = (sellers, userId) => sellers.find((seller) => seller.userId === userId) || null;
const shipmentBelongsToOrders = (shipment, orderIds) =>
  (shipment.orderIds || (shipment.orderId ? [shipment.orderId] : []))
    .some((orderId) => orderIds.has(orderId));
const maskIdentifier = (value) => {
  const compact = String(value || "").replace(/\s+/g, "");
  return compact ? `•••• ${compact.slice(-4)}` : "";
};
const verificationRequirements = {
  consumer: [],
  business_buyer: ["BUSINESS_REGISTRATION"],
  farmer: ["PHOTO_ID"],
  fpo_manager: ["ORGANIZATION_REGISTRATION"],
  driver: ["DRIVING_LICENCE"],
  logistics_partner: ["BUSINESS_REGISTRATION"],
  logistics: ["BUSINESS_REGISTRATION"],
};

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(["consumer", "business_buyer", "farmer", "fpo_manager", "driver", "logistics_partner"]),
  organization: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  locationCoordinates: z.tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)]).nullable().optional(),
  locationSource: z.enum(["MANUAL", "GPS", "REVERSE_GEOCODED"]).optional(),
  preferredLanguage: z.enum(["en", "hi", "or"]).default("en"),
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(/^[0-9+ ()-]{10,16}$/, "Enter a valid phone number"),
  organization: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().min(2).max(80),
  locationCoordinates: z.tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)]).nullable().optional(),
  locationSource: z.enum(["MANUAL", "GPS", "REVERSE_GEOCODED"]).optional(),
}).strict();
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
const harvestSchema = z.object({
  product: z.string().min(2),
  productId: z.string().optional(),
  expectedQuantity: z.coerce.number().positive(),
  expectedHarvestDate: z.string(),
  grade: z.string(),
  minimumPrice: z.coerce.number().positive(),
  location: z.string(),
  reservationPercent: z.coerce.number().min(0).max(100).default(80),
});
const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().min(10),
  image: z.string().optional(),
  retailPrice: z.coerce.number().positive(),
  bulkPrice: z.coerce.number().positive(),
  availableQuantity: z.coerce.number().min(0),
  minimumOrder: z.coerce.number().positive().default(1),
  bulkThreshold: z.coerce.number().positive(),
  grade: z.string(),
  harvestDate: z.string(),
  shelfLifeDays: z.coerce.number().positive(),
  organic: z.boolean().default(false),
  locationName: z.string().min(2),
  packaging: z.string().min(2),
});
const verificationReviewSchema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT", "SUSPEND", "REACTIVATE"]),
  reasonCode: z.string().trim().max(80).optional(),
  note: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  if (["REQUEST_CHANGES", "REJECT", "SUSPEND"].includes(value.action) && !value.note)
    context.addIssue({ code: "custom", path: ["note"], message: "Add a review note for this action" });
  if (value.action === "REJECT" && !value.reasonCode)
    context.addIssue({ code: "custom", path: ["reasonCode"], message: "Choose a rejection reason" });
});
const membershipRequestSchema = z.object({
  fpoId: z.string().min(2),
  message: z.string().trim().max(500).optional().default(""),
});
const membershipReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional().default(""),
});
const shipmentDispatchSchema = z.object({
  vehicleId: z.string().min(2),
});
const shipmentStopSchema = z.object({
  notes: z.string().trim().max(500).optional().default(""),
  quantity: z.coerce.number().min(0).optional(),
});
const shipmentIssueSchema = z.object({
  type: z.enum(["BREAKDOWN", "TRAFFIC", "WEATHER", "QUALITY", "QUANTITY", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  message: z.string().trim().min(3).max(500),
});
const loadOfferSchema = z.object({
  candidateShipmentId: z.string().min(2),
});
const loadOfferResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  note: z.string().trim().max(500).optional().default(""),
});

const assertShipmentAccess = (req, shipment, message = "Drivers can access only their assigned shipments") => {
  if (req.user.role === "driver" && shipment.driverUserId !== req.user.sub)
    throw new HttpError(403, message);
};

const optimizeStoredShipment = async (shipment, trigger, session = null) => {
  const route = optimizeRoute(
    shipment.stops,
    { capacity: shipment.capacity, load: shipment.load, coldChain: shipment.coldChain },
    { trigger, coldChainRequired: shipment.coldChainRequired },
  );
  return store.update("shipments", shipment._id, {
    ...route,
    autoOptimized: true,
    lastOptimizedAt: route.routeOptimization.optimizedAt,
  }, session);
};

router.get(
  "/health",
  asyncHandler(async (_req, res) =>
    ok(res, {
      status: "ok",
      storage: store.mode,
      timestamp: new Date().toISOString(),
      providers,
    }),
  ),
);
router.get(
  "/jobs/freshness",
  asyncHandler(async (req, res) => {
    const expected = env.cronSecret && `Bearer ${env.cronSecret}`;
    if (!expected || req.headers.authorization !== expected)
      throw new HttpError(401, "Invalid cron authorization");
    await refreshLotFreshness();
    ok(res, { status: "ok", job: "freshness", ranAt: new Date().toISOString() });
  }),
);
router.get(
  "/locations/reverse",
  asyncHandler(async (req, res) => {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    try {
      const location = await reverseIndiaLocation(latitude, longitude);
      ok(res, location, {
        privacy: "Coordinates are used only to resolve the selected location and are not exposed publicly.",
      });
    } catch (error) {
      throw new HttpError(400, error.message);
    }
  }),
);
router.post(
  "/uploads",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "logistics", "admin"),
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose an image to upload");
    ok(res, {
      url: `/uploads/${req.file.filename}`,
      provider: providers.uploads.name,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  }),
);

router.post(
  "/auth/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const identifier = req.body.identifier.toLowerCase();
    const user =
      (await store.find("users", { email: identifier })) ||
      (await store.find("users", { phone: req.body.identifier }));
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
      throw new HttpError(401, "Email/phone or password is incorrect");
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await store.update("users", user._id, {
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
    });
    res.cookie("kishan_bhaiya_refresh", refreshToken, {
      ...refreshCookieOptions,
      maxAge: 7 * 86400000,
    });
    ok(res, { user: cleanUser(user), accessToken });
  }),
);
router.post(
  "/auth/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    if (await store.find("users", { email: req.body.email.toLowerCase() }))
      throw new HttpError(409, "An account with this email already exists");
    const { password, ...registration } = req.body;
    const automaticallyActive = registration.role === "consumer";
    const user = await store.create(
      "users",
      {
        ...registration,
        email: registration.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        contactVerified: true,
        verified: automaticallyActive,
        accountStatus: automaticallyActive ? "ACTIVE" : "PENDING_ADMIN_APPROVAL",
        verificationStatus: automaticallyActive ? "APPROVED" : "PENDING",
      },
      "user",
    );
    await store.create("verificationProfiles", {
      userId: user._id,
      role: user.role,
      overallStatus: automaticallyActive ? "APPROVED" : "PENDING_ADMIN_APPROVAL",
      submittedAt: new Date().toISOString(),
      approvedAt: automaticallyActive ? new Date().toISOString() : undefined,
      riskFlags: [],
      missingRequirements: verificationRequirements[user.role] || [],
      resubmissionCount: 0,
    }, "verification");
    await store.create("auditLogs", {
      actorId: user._id,
      action: "VERIFICATION_SUBMITTED",
      entityType: "VerificationProfile",
      entityId: user._id,
      metadata: { role: user.role, automaticallyActive },
    }, "audit");
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await store.update("users", user._id, {
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
    });
    res.cookie("kishan_bhaiya_refresh", refreshToken, {
      ...refreshCookieOptions,
      maxAge: 7 * 86400000,
    });
    ok(res, { user: cleanUser(user), accessToken });
  }),
);
router.post(
  "/auth/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies.kishan_bhaiya_refresh;
    if (!token) throw new HttpError(401, "Refresh session not found");
    const payload = jwt.verify(token, env.refreshSecret);
    const user = await store.get("users", payload.sub);
    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(token, user.refreshTokenHash))
    )
      throw new HttpError(401, "Refresh session is invalid");
    ok(res, { user: cleanUser(user), accessToken: signAccess(user) });
  }),
);
router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    res.clearCookie("kishan_bhaiya_refresh", refreshCookieOptions);
    ok(res, { message: "Signed out" });
  }),
);
router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await store.get("users", req.user.sub);
    ok(res, cleanUser(user));
  }),
);
router.patch(
  "/auth/me",
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const emailOwner = await store.find("users", { email: req.body.email });
    if (emailOwner && emailOwner._id !== req.user.sub)
      throw new HttpError(409, "An account with this email already exists");
    const updated = await store.update("users", req.user.sub, req.body);
    const seller = (await store.list("sellers")).find((item) => item.userId === req.user.sub);
    if (seller && req.body.location)
      await store.update("sellers", seller._id || seller.id, { location: req.body.location });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: req.user.sub,
      metadata: { fields: Object.keys(req.body) },
    }, "audit");
    emit(req, "profile:updated", { userId: req.user.sub });
    ok(res, { user: cleanUser(updated), accessToken: signAccess(updated) });
  }),
);
router.post(
  "/auth/me/avatar",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a profile image to upload");
    const profileImage = `/uploads/${req.file.filename}`;
    const updated = await store.update("users", req.user.sub, { profileImage });
    const seller = (await store.list("sellers")).find((item) => item.userId === req.user.sub);
    if (seller)
      await store.update("sellers", seller._id || seller.id, { image: profileImage });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "PROFILE_IMAGE_UPDATED",
      entityType: "User",
      entityId: req.user.sub,
      metadata: { provider: providers.uploads.name },
    }, "audit");
    emit(req, "profile:updated", { userId: req.user.sub });
    ok(res, { user: cleanUser(updated), accessToken: signAccess(updated) });
  }),
);
router.delete(
  "/auth/me/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await store.update("users", req.user.sub, { profileImage: "" });
    const seller = (await store.list("sellers")).find((item) => item.userId === req.user.sub);
    if (seller)
      await store.update("sellers", seller._id || seller.id, { image: "" });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "PROFILE_IMAGE_REMOVED",
      entityType: "User",
      entityId: req.user.sub,
    }, "audit");
    emit(req, "profile:updated", { userId: req.user.sub });
    ok(res, { user: cleanUser(updated), accessToken: signAccess(updated) });
  }),
);

router.get(
  "/auth/verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await store.get("users", req.user.sub);
    if (!user) throw new HttpError(404, "Account not found");
    let profile = await store.find("verificationProfiles", { userId: user._id });
    if (!profile) {
      profile = await store.create("verificationProfiles", {
        userId: user._id,
        role: user.role,
        overallStatus: accountStatusOf(user) === "ACTIVE" ? "APPROVED" : accountStatusOf(user),
        submittedAt: user.createdAt,
        approvedAt: accountStatusOf(user) === "ACTIVE" ? user.updatedAt : undefined,
        riskFlags: [],
        missingRequirements: verificationRequirements[user.role] || [],
        resubmissionCount: 0,
      }, "verification");
    }
    const documents = await store.list("verificationDocuments", { ownerId: user._id });
    const reviews = await store.list("verificationReviews", { applicantId: user._id });
    ok(res, {
      user: cleanUser(user),
      profile,
      documents: documents.map(cleanVerificationDocument),
      reviews,
    });
  }),
);
router.post(
  "/auth/verification/documents",
  requireAuth,
  verificationUpload.single("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a verification document");
    const documentType = String(req.body.documentType || "").trim().toUpperCase();
    if (!/^[A-Z0-9_]{3,60}$/.test(documentType))
      throw new HttpError(400, "Choose a valid document type");
    const document = await store.create("verificationDocuments", {
      ownerId: req.user.sub,
      documentType,
      documentNumberMasked: maskIdentifier(req.body.documentNumberMasked),
      secureFileKey: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: "PENDING",
      expiryDate: req.body.expiryDate || undefined,
    }, "document");
    const profile = await store.find("verificationProfiles", { userId: req.user.sub });
    if (profile) {
      await store.update("verificationProfiles", profile._id, {
        missingRequirements: (profile.missingRequirements || []).filter((requirement) => requirement !== documentType),
      });
    }
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "VERIFICATION_DOCUMENT_UPLOADED",
      entityType: "VerificationDocument",
      entityId: document._id,
      metadata: { documentType, mimeType: req.file.mimetype, size: req.file.size },
    }, "audit");
    ok(res, cleanVerificationDocument(document));
  }),
);
router.post(
  "/auth/verification/submit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await store.get("users", req.user.sub);
    const currentStatus = accountStatusOf(user);
    if (currentStatus === "SUSPENDED")
      throw new HttpError(403, "A suspended account must be reviewed by an administrator");
    if (currentStatus === "REJECTED")
      throw new HttpError(403, "This application was rejected and cannot be resubmitted without administrator review");
    const profile = await store.find("verificationProfiles", { userId: req.user.sub });
    if (!profile) throw new HttpError(404, "Verification profile not found");
    const resubmission = currentStatus === "CHANGES_REQUESTED";
    const updatedProfile = await store.update("verificationProfiles", profile._id, {
      overallStatus: "PENDING_ADMIN_APPROVAL",
      submittedAt: new Date().toISOString(),
      adminNote: "",
      rejectionReasonCode: "",
      resubmissionCount: (profile.resubmissionCount || 0) + (resubmission ? 1 : 0),
    });
    const updatedUser = await store.update("users", req.user.sub, {
      accountStatus: "PENDING_ADMIN_APPROVAL",
      verificationStatus: "PENDING",
      verified: false,
    });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: resubmission ? "VERIFICATION_RESUBMITTED" : "VERIFICATION_SUBMITTED",
      entityType: "VerificationProfile",
      entityId: profile._id,
    }, "audit");
    emit(req, "verification:updated", { userId: req.user.sub, status: "PENDING_ADMIN_APPROVAL" });
    ok(res, { user: cleanUser(updatedUser), profile: updatedProfile, accessToken: signAccess(updatedUser) });
  }),
);

router.use(asyncHandler(async (req, _res, next) => {
  if (!req.user || req.user.role === "admin") return next();
  const publicBrowse = req.method === "GET" && [
    /^\/products(?:\/|$)/,
    /^\/sellers(?:\/|$)/,
    /^\/quality-passports(?:\/|$)/,
    /^\/price-intelligence(?:\/|$)/,
  ].some((pattern) => pattern.test(req.path));
  if (publicBrowse) return next();
  const user = await store.get("users", req.user.sub);
  const accountStatus = accountStatusOf(user);
  if (accountStatus === "ACTIVE") return next();
  const error = new HttpError(403, "Complete account verification before using this feature", { accountStatus });
  error.code = "ACCOUNT_NOT_ACTIVE";
  next(error);
}));

router.get(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const keys = ["products", "lots", "hubs"];
    const data = Object.fromEntries(
      await Promise.all(keys.map(async (key) => [key, await store.list(key)])),
    );
    data.quotations = [];
    data.orders = [];
    data.shipments = [];
    data.notifications = [];
    data.vehicles = [];
    data.requirements = [];
    data.expectedHarvests = [];
    if (req.user) {
      const sellers = await store.list("sellers");
      const seller = sellerForUser(sellers, req.user.sub);
      const isProducer = ["farmer", "fpo_manager"].includes(req.user.role);
      const canProcure = req.user.role === "business_buyer";
      data.workspace = { seller: seller || null };
      if (isProducer) {
        data.products = seller ? data.products.filter((product) => product.sellerId === seller.id) : [];
        data.lots = seller ? data.lots.filter((lot) => lot.sellerId === seller.id) : [];
      }
      if (req.user.role === "admin" || isProducer || canProcure) {
        const requirements = await store.list("requirements");
        data.requirements = canProcure
          ? requirements.filter((r) => r.buyerId === req.user.sub)
          : requirements;
      }
      if (req.user.role === "admin" || isProducer) {
        const harvests = await store.list("expectedHarvests");
        data.expectedHarvests = req.user.role === "admin"
          ? harvests
          : harvests.filter((h) => [seller?.id, req.user.sub].includes(h.sellerId));
      }
      if (req.user.role === "admin")
        data.quotations = await store.list("quotations");
      else if (isProducer && seller)
        data.quotations = await store.list("quotations", { sellerId: seller.id });
      else if (canProcure) {
        const quotes = await store.list("quotations");
        data.quotations = quotes.filter((q) =>
          data.requirements.some((r) => r._id === q.requirementId),
        );
      }
      if (["consumer", "business_buyer", "farmer", "fpo_manager", "admin"].includes(req.user.role)) {
        const orders = await store.list("orders");
        data.orders = req.user.role === "admin"
          ? orders
          : orders.filter(
              (o) => o.buyerId === req.user.sub || o.sellerId === seller?.id,
            );
      }
      if (["driver", "logistics_partner", "logistics", "admin"].includes(req.user.role)) {
        const shipments = await store.list("shipments");
        data.shipments = req.user.role === "driver"
          ? shipments.filter((shipment) => shipment.driverUserId === req.user.sub)
          : shipments;
      } else if (isProducer) {
        const orderIds = new Set(data.orders.map((order) => order._id));
        data.shipments = (await store.list("shipments"))
          .filter((shipment) => shipmentBelongsToOrders(shipment, orderIds));
      }
      data.notifications = await store.list("notifications", {
        userId: req.user.sub,
      });
      if (["driver", "logistics_partner", "logistics", "admin"].includes(req.user.role))
        data.vehicles = await store.list("vehicles");
    }
    ok(res, data, { storage: store.mode, providers });
  }),
);
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    let products = await store.list("products");
    const { q, category, organic, sort, sellerId } = req.query;
    if (q)
      products = products.filter((p) =>
        `${p.name} ${p.category} ${p.seller?.name}`
          .toLowerCase()
          .includes(String(q).toLowerCase()),
      );
    if (category && category !== "All")
      products = products.filter((p) => p.category === category);
    if (organic === "true") products = products.filter((p) => p.organic);
    if (sellerId) products = products.filter((p) => p.sellerId === sellerId);
    const sorters = {
      price_asc: (a, b) => a.retailPrice - b.retailPrice,
      price_desc: (a, b) => b.retailPrice - a.retailPrice,
      rating: (a, b) => b.rating - a.rating,
      freshest: (a, b) => new Date(b.harvestDate) - new Date(a.harvestDate),
    };
    if (sorters[sort]) products.sort(sorters[sort]);
    ok(res, products, { count: products.length });
  }),
);
router.post(
  "/products",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  validate(productSchema),
  asyncHandler(async (req, res) => {
    const sellers = await store.list("sellers");
    let seller = sellerForUser(sellers, req.user.sub);
    if (!seller) {
      seller = {
      id: req.user.sub,
      userId: req.user.sub,
      name: req.user.name,
      type: req.user.role === "fpo_manager" ? "FPO" : "Farmer",
      location: req.body.locationName,
      rating: 5,
      reliability: 100,
      verified: true,
      };
      await store.create("sellers", seller, "seller");
    }
    const product = await store.create(
      "products",
      {
        ...req.body,
        slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sellerId: seller.id,
        seller,
        unit: "kg",
        status: "active",
        rating: 5,
        reviews: 0,
        featured: false,
        coordinates: seller.coordinates || [85.8245, 20.2961],
        image:
          req.body.image ||
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=82",
      },
      "prod",
    );
    await store.create(
      "lots",
      {
        productId: product._id,
        sellerId: seller.id,
        product: product.name,
        lotCode: `KB-${Date.now().toString().slice(-6)}`,
        quantity: product.availableQuantity,
        availableQuantity: product.availableQuantity,
        unit: "kg",
        grade: product.grade,
        harvestDate: product.harvestDate,
        expiryDate: new Date(
          new Date(product.harvestDate).getTime() +
            product.shelfLifeDays * 86400000,
        ).toISOString(),
        freshnessState: "FRESH",
        storage: "Seller-declared storage",
        perishability: product.shelfLifeDays <= 7 ? "high" : "medium",
        currentPrice: product.retailPrice,
        suggestedPrice: Math.round(product.retailPrice * 0.85),
        nearbyBuyerCount: 0,
        coordinates: product.coordinates,
      },
      "lot",
    );
    emit(req, "product:new", product);
    ok(res, product);
  }),
);
router.get(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const p = await store.get("products", req.params.id);
    if (!p) throw new HttpError(404, "Product not found");
    ok(res, p);
  }),
);
router.get(
  "/products/:id/related",
  asyncHandler(async (req, res) => {
    const product = await store.get("products", req.params.id);
    if (!product) throw new HttpError(404, "Product not found");
    const limit = Math.min(8, Math.max(1, Number(req.query.limit) || 4));
    const products = await store.list("products", { status: "active" });
    const related = products
      .filter((candidate) => candidate._id !== product._id)
      .map((candidate) => ({
        product: candidate,
        score:
          (candidate.category === product.category ? 6 : 0) +
          (candidate.sellerId === product.sellerId ? 4 : 0) +
          (candidate.organic === product.organic ? 1 : 0) +
          Number(candidate.rating || 0) / 10,
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.product.rating || 0) - Number(a.product.rating || 0),
      )
      .slice(0, limit)
      .map(({ product: candidate }) => candidate);
    ok(res, related, {
      basis: "Same category and seller, then rating and production method",
    });
  }),
);
router.get(
  "/sellers/:id",
  asyncHandler(async (req, res) => {
    const sellerProducts = await store.list("products", {
      sellerId: req.params.id,
    });
    const seller =
      (await store.find("sellers", { id: req.params.id })) ||
      sellerProducts.find((product) => product.seller)?.seller;
    if (!seller) throw new HttpError(404, "Seller not found");
    const products = sellerProducts
      .filter((product) => product.status === "active")
      .sort((a, b) => Number(b.featured) - Number(a.featured));
    const lots = await store.list("lots", { sellerId: seller.id });
    const publicSeller = Object.fromEntries(
      Object.entries(seller).filter(
        ([key]) => !["userId", "coordinates"].includes(key),
      ),
    );
    ok(res, {
      seller: {
        ...publicSeller,
        verified: true,
        about:
          seller.about ||
          `${seller.name} supplies carefully graded produce from ${seller.location}, with lot-level inventory and transparent marketplace fulfilment history.`,
      },
      products,
      stats: {
        activeListings: products.length,
        availableQuantity: products.reduce(
          (total, product) => total + Number(product.availableQuantity || 0),
          0,
        ),
        categories: [...new Set(products.map((product) => product.category))],
        freshLots: lots.filter((lot) => lot.freshnessState === "FRESH").length,
        sellSoonLots: lots.filter((lot) =>
          ["SELL_SOON", "URGENT"].includes(lot.freshnessState),
        ).length,
      },
      trust: {
        metricBasis: "Visible platform order and fulfilment history",
        privateContactHidden: true,
        traceabilityAvailable: lots.length > 0,
      },
    });
  }),
);
router.get(
  "/lots",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await store.list(
        "lots",
        req.query.sellerId ? { sellerId: req.query.sellerId } : {},
      ),
    ),
  ),
);
router.get(
  "/lots/:id/quality-passport",
  asyncHandler(async (req, res) => {
    const passport = await store.find("qualityPassports", {
      lotId: req.params.id,
    });
    if (!passport) throw new HttpError(404, "Quality passport not found");
    ok(res, passport);
  }),
);
router.get(
  "/marketplace/surplus",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const lots = await store.list("lots");
    const seller = req.user.role === "admin"
      ? null
      : (await store.list("sellers")).find((s) => s.userId === req.user.sub);
    ok(
      res,
      lots.filter((l) =>
        ["FRESH", "SELL_SOON", "URGENT"].includes(l.freshnessState) &&
        (req.user.role === "admin" || [seller?.id, req.user.sub].includes(l.sellerId)),
      ),
    );
  }),
);
router.get(
  "/marketplace/search",
  asyncHandler(async (req, res) => {
    req.url = `/products?q=${encodeURIComponent(req.query.q || "")}`;
    router.handle(req, res);
  }),
);
router.get(
  "/price-intelligence/:productId",
  asyncHandler(async (req, res) => {
    const product = await store.get("products", req.params.productId);
    if (!product) throw new HttpError(404, "Product not found");
    const history = (
      await store.list("priceSnapshots", { productId: req.params.productId })
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = history.at(-1) || {};
    ok(res, {
      product,
      history,
      summary: {
        marketplaceMedian: latest.marketplaceMedian || product.bulkPrice,
        localReference: latest.localReference || product.bulkPrice * 1.03,
        sellerAverage: latest.sellerAverage || product.bulkPrice * 0.98,
        range: [
          Number((product.bulkPrice * 0.97).toFixed(1)),
          Number((product.bulkPrice * 1.08).toFixed(1)),
        ],
        source: latest.source || "Kishan Bhaiya seeded reference provider",
        timestamp: latest.date || new Date().toISOString(),
        indicative: true,
      },
    });
  }),
);

router.get(
  "/orders",
  requireAuth,
  allowRoles("consumer", "business_buyer", "admin"),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await store.list(
        "orders",
        req.user.role === "admin" ? {} : { buyerId: req.user.sub },
      ),
    ),
  ),
);
router.get(
  "/orders/:id",
  requireAuth,
  allowRoles("consumer", "business_buyer", "farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const order = await store.get("orders", req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    const sellers = await store.list("sellers");
    const seller = sellers.find((s) => s.id === order.sellerId);
    const allSuborders = await store.list("subFulfillments", { orderId: order._id });
    const ownedSeller = sellers.find((candidate) => candidate.userId === req.user.sub);
    const sellerSuborders = ownedSeller
      ? allSuborders.filter((suborder) => suborder.sellerId === ownedSeller.id)
      : [];
    if (
      req.user.role !== "admin" &&
      order.buyerId !== req.user.sub &&
      seller?.userId !== req.user.sub &&
      !sellerSuborders.length
    )
      throw new HttpError(403, "You do not have access to this order");
    const shipmentIds = order.shipmentIds?.length
      ? order.shipmentIds
      : order.shipmentId ? [order.shipmentId] : [];
    const shipments = (await Promise.all(shipmentIds.map((shipmentId) => store.get("shipments", shipmentId))))
      .filter(Boolean);
    const suborders = order.buyerId === req.user.sub || req.user.role === "admin"
      ? allSuborders
      : sellerSuborders;
    ok(res, { ...order, shipment: shipments[0] || null, shipments, suborders });
  }),
);
router.post(
  "/orders",
  requireAuth,
  allowRoles("consumer", "business_buyer"),
  asyncHandler(async (req, res) => {
    if (!Array.isArray(req.body.items) || !req.body.items.length)
      throw new HttpError(400, "Your cart is empty");
    const idempotencyKey = req.get("Idempotency-Key");
    if (idempotencyKey) {
      const existing = await store.find("orders", {
        buyerId: req.user.sub,
        idempotencyKey,
      });
      if (existing) return ok(res, existing, { idempotentReplay: true });
    }
    const order = await store.transaction(async (session) => {
      const products = await Promise.all(
        req.body.items.map((i) => store.get("products", i.productId, session)),
      );
      let subtotal = 0;
      const items = [];
      for (let i = 0; i < products.length; i++) {
        const product = products[i],
          quantity = Number(req.body.items[i].quantity);
        if (!product || quantity <= 0)
          throw new HttpError(400, "One or more cart items are invalid");
        if (quantity > product.availableQuantity)
          throw new HttpError(
            409,
            `${product.name} has only ${product.availableQuantity}${product.unit} available`,
          );
        const price =
          quantity >= product.bulkThreshold
            ? product.bulkPrice
            : product.retailPrice;
        subtotal += price * quantity;
        items.push({
          productId: product._id,
          name: product.name,
          image: product.image,
          quantity,
          price,
          unit: product.unit,
        });
      }
      const deliveryFee = subtotal >= 799 ? 0 : 49,
        total = subtotal + deliveryFee;
      const created = await store.create(
        "orders",
        {
          buyerId: req.user.sub,
          idempotencyKey,
          type: req.body.type === "BULK" ? "BULK_DIRECT" : "RETAIL",
          items,
          subtotal,
          deliveryFee,
          total,
          status: "CONFIRMED",
          paymentStatus:
            req.body.paymentMethod === "COD" ? "COD_PENDING" : "PAID_MOCK",
          paymentProvider: providers.payment.name,
          deliveryAddress: req.body.deliveryAddress,
          deliverySlot: req.body.deliverySlot,
        },
        "order",
        session,
      );
      for (const item of items) {
        const product = products.find((p) => p._id === item.productId);
        await store.update(
          "products",
          product._id,
          { availableQuantity: product.availableQuantity - item.quantity },
          session,
        );
      }
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "ORDER_CREATED",
          entityType: "Order",
          entityId: created._id,
          metadata: { total },
        },
        "audit",
        session,
      );
      return created;
    });
    emit(req, "order:statusChanged", order);
    ok(res, order);
  }),
);
router.post(
  "/orders/:id/shortage",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const order = await store.get("orders", req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    if (req.user.role !== "admin") {
      const seller = (await store.list("sellers")).find((s) => s.userId === req.user.sub);
      if (!seller || order.sellerId !== seller.id)
        throw new HttpError(403, "Only the assigned seller can report a shortage");
    }
    const missingQuantity = Number(req.body.missingQuantity);
    if (!missingQuantity || missingQuantity <= 0)
      throw new HttpError(400, "Enter the missing quantity");
    const requirement = order.requirementId
      ? await store.get("requirements", order.requirementId)
      : null;
    const candidates = requirement
      ? scoreCandidates(
          { ...requirement, quantity: missingQuantity },
          await store.list("products"),
          await store.list("lots"),
        ).filter((c) => c.sellerId !== order.sellerId)
      : [];
    const replacementPlan = requirement
      ? buildFulfillmentPlan(
          { ...requirement, quantity: missingQuantity },
          candidates,
        )
      : null;
    const updated = await store.update("orders", order._id, {
      status: "SUPPLIER_REPLACEMENT_REQUIRED",
      shortage: {
        reportedBy: req.user.sub,
        missingQuantity,
        reason: req.body.reason || "Seller-reported shortage",
        reportedAt: new Date().toISOString(),
      },
      replacementPlan,
    });
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "SUPPLIER_SHORTAGE_REPORTED",
        entityType: "Order",
        entityId: order._id,
        metadata: { missingQuantity },
      },
      "audit",
    );
    emit(req, "notification:new", {
      type: "SUPPLIER_REPLACEMENT_REQUIRED",
      orderId: order._id,
    });
    ok(res, updated);
  }),
);

router.get(
  "/bulk-requirements",
  requireAuth,
  allowRoles("business_buyer", "farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const requirements = await store.list("requirements");
    ok(res, req.user.role === "business_buyer"
      ? requirements.filter((r) => r.buyerId === req.user.sub)
      : requirements);
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
      throw new HttpError(403, "Only the requirement owner can view procurement details");
    const acceptedOrder = ["ACCEPTED", "PARTIALLY_FILLED"].includes(requirement.status)
      ? await store.find("orders", { requirementId: requirement._id, type: "BULK_MULTI_SELLER" })
      : null;
    ok(res, acceptedOrder ? {
      ...requirement,
      acceptedOrderId: acceptedOrder._id,
      acceptedAt: requirement.acceptedAt || acceptedOrder.createdAt,
      acceptedSplitSummary: acceptedOrder.splitSummary,
    } : requirement);
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
      throw new HttpError(403, "Only the requirement owner can view supplier matches");
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
        const existingOrder = await store.find("orders", {
          requirementId: requirement._id,
          type: "BULK_MULTI_SELLER",
        }, session);
        if (!existingOrder) throw new HttpError(409, "This fulfillment plan has already been accepted");
        const suborders = await store.list("subFulfillments", { orderId: existingOrder._id }, session);
        const shipmentIds = existingOrder.shipmentIds?.length
          ? existingOrder.shipmentIds
          : existingOrder.shipmentId ? [existingOrder.shipmentId] : [];
        const shipments = (await Promise.all(shipmentIds.map((shipmentId) => store.get("shipments", shipmentId, session)))).filter(Boolean);
        return { ...existingOrder, suborders, shipments, idempotentReplay: true };
      }
      const candidates = scoreCandidates(
        requirement,
        await store.list("products", {}, session),
        await store.list("lots", {}, session),
      );
      const plan = buildFulfillmentPlan(requirement, candidates);
      const requiredCoverage = requirement.allowPartial === false
        ? 100
        : requirement.minFillPercent;
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
              l.productId === requirement.productId && l.availableQuantity > 0,
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
          throw new HttpError(409, `Supplier inventory changed; ${remaining}${requirement.unit} could not be reserved`);
        const seller = sellers.find((candidate) => candidate.id === allocation.sellerId) || allocation.seller;
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
          coldChainRequired: lotAllocations.some((lot) => lot.coldChainRequired),
        });
        if (seller?.userId) await store.create("notifications", {
          userId: seller.userId,
          title: "Bulk allocation reserved",
          message: `${allocation.quantity}${requirement.unit} of ${requirement.product} was allocated to your farm for order ${order._id}.`,
          type: "BULK_ALLOCATION",
          entityId: suborder._id,
          read: false,
        }, "note", session);
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
        hubs,
      });
      const shipments = [];
      for (const draft of shipmentDrafts) {
        const shipment = await store.create("shipments", draft, "ship", session);
        shipments.push(shipment);
        if (shipment.vehicleId)
          await store.update("vehicles", shipment.vehicleId, { status: "ASSIGNED", shipmentId: shipment._id }, session);
        if (shipment.driverUserId) {
          await store.update("users", shipment.driverUserId, { currentShipmentId: shipment._id }, session);
          await store.create("notifications", {
            userId: shipment.driverUserId,
            title: "New optimized trip assigned",
            message: `${shipment.load}${requirement.unit} · ${shipment.stops.length} stops · next: ${shipment.nextStop?.label || "open trip"}.`,
            type: "SHIPMENT_ASSIGNED",
            entityId: shipment._id,
            read: false,
          }, "note", session);
        }
      }
      const updatedOrder = await store.update("orders", order._id, {
        shipmentId: shipments[0]?._id || null,
        shipmentIds: shipments.map((shipment) => shipment._id),
        splitSummary: {
          supplierCount: suborders.length,
          shipmentCount: shipments.length,
          autoDispatchedCount: shipments.filter((shipment) => !shipment.dispatchRequired).length,
          allocations: suborders.map((suborder) => ({
            subFulfillmentId: suborder._id,
            sellerId: suborder.sellerId,
            sellerName: suborder.sellerName,
            quantity: suborder.quantity,
            allocationPercent: suborder.allocationPercent,
            status: suborder.status,
          })),
        },
      }, session);
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
      throw new HttpError(403, "Only the requirement owner can compare quotations");
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
      const offers = negotiation.offers.map((o) => ({ ...o, current: false }));
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
    const requirement = await store.get("requirements", existing.requirementId);
    const seller = await store.find("sellers", { id: existing.sellerId });
    if (
      req.user.role !== "admin" &&
      requirement.buyerId !== req.user.sub &&
      seller?.userId !== req.user.sub
    )
      throw new HttpError(403, "Only quotation participants can reject");
    const quote = await store.update("quotations", req.params.id, {
      status: "REJECTED",
    });
    emit(req, "quotation:updated", quote);
    ok(res, quote);
  }),
);

router.get(
  "/expected-harvests",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const harvests = await store.list("expectedHarvests");
    if (req.user.role === "admin") return ok(res, harvests);
    const seller = (await store.list("sellers")).find((s) => s.userId === req.user.sub);
    ok(res, harvests.filter((h) => [seller?.id, req.user.sub].includes(h.sellerId)));
  }),
);
router.post(
  "/expected-harvests",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  validate(harvestSchema),
  asyncHandler(async (req, res) => {
    const seller = (await store.list("sellers")).find((s) => s.userId === req.user.sub);
    ok(res, await store.create(
      "expectedHarvests",
      {
        ...req.body,
        sellerId: seller?.id || req.user.sub,
        reservedQuantity: 0,
        status: "UPCOMING",
        unit: "kg",
        interestedBuyers: 0,
      },
      "harvest",
    ));
  }),
);
router.post(
  "/expected-harvests/:id/reservations",
  requireAuth,
  allowRoles("consumer", "business_buyer"),
  asyncHandler(async (req, res) => {
    const harvest = await store.get("expectedHarvests", req.params.id);
    const quantity = Number(req.body.quantity);
    if (
      !harvest ||
      quantity <= 0 ||
      quantity > harvest.expectedQuantity - harvest.reservedQuantity
    )
      throw new HttpError(
        409,
        "Requested reservation quantity is not available",
      );
    const reservation = await store.create(
      "reservations",
      {
        harvestId: harvest._id,
        buyerId: req.user.sub,
        quantity,
        status: "ACTIVE",
        conditional: true,
      },
      "reservation",
    );
    await store.update("expectedHarvests", harvest._id, {
      reservedQuantity: harvest.reservedQuantity + quantity,
      interestedBuyers: (harvest.interestedBuyers || 0) + 1,
    });
    ok(res, reservation);
  }),
);
router.post(
  "/expected-harvests/:id/convert",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const harvest = await store.get("expectedHarvests", req.params.id);
    if (!harvest) throw new HttpError(404, "Expected harvest not found");
    if (req.user.role !== "admin") {
      const seller = (await store.list("sellers")).find((s) => s.userId === req.user.sub);
      if (![seller?.id, req.user.sub].includes(harvest.sellerId))
        throw new HttpError(403, "Only the harvest owner can convert this record");
    }
    if (harvest.status === "CONVERTED")
      throw new HttpError(409, "This harvest has already been converted");
    const lot = await store.create(
      "lots",
      {
        productId: harvest.productId,
        sellerId: harvest.sellerId,
        product: harvest.product,
        lotCode: `KB-${Date.now().toString().slice(-6)}`,
        quantity: harvest.expectedQuantity,
        availableQuantity: harvest.expectedQuantity - harvest.reservedQuantity,
        unit: harvest.unit,
        grade: harvest.grade,
        harvestDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 8 * 86400000).toISOString(),
        freshnessState: "FRESH",
        storage: "Producer-declared handling",
        perishability: "high",
        currentPrice: harvest.minimumPrice,
        coordinates: [85.6156, 20.182],
      },
      "lot",
    );
    await store.update("expectedHarvests", harvest._id, {
      status: "CONVERTED",
      convertedLotId: lot._id,
    });
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "EXPECTED_HARVEST_CONVERTED",
        entityType: "ExpectedHarvest",
        entityId: harvest._id,
        metadata: { lotId: lot._id },
      },
      "audit",
    );
    ok(res, lot);
  }),
);
router.post(
  "/lots/:id/rescue-offers",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const lot = await store.get("lots", req.params.id);
    if (!lot) throw new HttpError(404, "Lot not found");
    if (req.user.role !== "admin") {
      const seller = (await store.list("sellers")).find((s) => s.userId === req.user.sub);
      if (![seller?.id, req.user.sub].includes(lot.sellerId))
        throw new HttpError(403, "Only the lot owner can create a rescue offer");
    }
    const price = Number(req.body.price || lot.suggestedPrice);
    if (price <= 0) throw new HttpError(400, "Enter a valid promotional price");
    const offer = await store.create(
      "rescueOffers",
      {
        lotId: lot._id,
        sellerId: lot.sellerId,
        price,
        quantity: Number(req.body.quantity || lot.availableQuantity),
        radiusKm: Number(req.body.radiusKm || 50),
        status: "ACTIVE",
        sellerConfirmed: true,
      },
      "rescue",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "RESCUE_OFFER_CREATED",
        entityType: "ProduceLot",
        entityId: lot._id,
        metadata: { offerId: offer._id, price },
      },
      "audit",
    );
    emit(req, "notification:new", { type: "SURPLUS_RESCUE", offer });
    ok(res, offer);
  }),
);

router.get(
  "/recurring-requirements",
  requireAuth,
  allowRoles("business_buyer", "admin"),
  asyncHandler(async (req, res) => ok(res, await store.list(
    "recurring",
    req.user.role === "admin" ? {} : { buyerId: req.user.sub },
  ))),
);
router.post(
  "/recurring-requirements",
  requireAuth,
  allowRoles("business_buyer"),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await store.create(
        "recurring",
        { ...req.body, buyerId: req.user.sub, status: "ACTIVE" },
        "recurring",
      ),
    ),
  ),
);
router.patch(
  "/recurring-requirements/:id",
  requireAuth,
  allowRoles("business_buyer"),
  asyncHandler(async (req, res) => {
    const recurring = await store.get("recurring", req.params.id);
    if (!recurring) throw new HttpError(404, "Recurring requirement not found");
    if (req.user.role !== "admin" && recurring.buyerId !== req.user.sub)
      throw new HttpError(403, "Only the recurring requirement owner can change it");
    ok(res, await store.update("recurring", req.params.id, req.body));
  }),
);
router.get(
  "/fpo/members",
  requireAuth,
  allowRoles("fpo_manager"),
  asyncHandler(async (req, res) => {
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    ok(res, managedFpo ? await store.list("members", { fpoId: managedFpo.id }) : []);
  }),
);
router.get(
  "/fpos",
  requireAuth,
  allowRoles("farmer"),
  asyncHandler(async (_req, res) => {
    const fpos = (await store.list("sellers"))
      .filter((seller) => seller.type === "FPO" && seller.userId)
      .map(({ id: fpoId, name, location, rating, reviews, reliability, completedOrders, image }) => ({
        fpoId,
        name,
        location,
        rating,
        reviews,
        reliability,
        completedOrders,
        image,
      }));
    ok(res, fpos);
  }),
);
router.get(
  "/fpo/membership-requests",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const requests = await store.list("fpoMembershipRequests");
    if (req.user.role === "farmer")
      return ok(res, requests.filter((request) => request.farmerId === req.user.sub));
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    ok(res, managedFpo ? requests.filter((request) => request.fpoId === managedFpo.id) : []);
  }),
);
router.post(
  "/fpo/membership-requests",
  requireAuth,
  allowRoles("farmer"),
  validate(membershipRequestSchema),
  asyncHandler(async (req, res) => {
    const farmer = await store.get("users", req.user.sub);
    const fpo = (await store.list("sellers")).find(
      (seller) => seller.id === req.body.fpoId && seller.type === "FPO" && seller.userId,
    );
    if (!fpo) throw new HttpError(404, "This FPO is not available for membership requests");
    const requests = await store.list("fpoMembershipRequests");
    const existing = requests.find(
      (request) => request.farmerId === req.user.sub && request.fpoId === fpo.id && ["PENDING", "APPROVED"].includes(request.status),
    );
    if (existing)
      throw new HttpError(409, existing.status === "APPROVED" ? "You are already a member of this FPO" : "A membership request is already pending");
    const request = await store.create(
      "fpoMembershipRequests",
      {
        fpoId: fpo.id,
        fpoName: fpo.name,
        farmerId: req.user.sub,
        farmerName: farmer?.name || req.user.name,
        farmName: farmer?.organization || `${farmer?.name || req.user.name}'s farm`,
        location: farmer?.location || "Not provided",
        message: req.body.message,
        status: "PENDING",
      },
      "membership",
    );
    await Promise.all([
      store.create("notifications", {
        userId: fpo.userId,
        title: "New FPO membership request",
        message: `${request.farmerName} requested to join ${fpo.name}.`,
        type: "FPO_MEMBERSHIP_REQUEST",
        entityId: request._id,
        read: false,
      }, "note"),
      store.create("auditLogs", {
        actorId: req.user.sub,
        action: "FPO_MEMBERSHIP_REQUESTED",
        entityType: "FPOMembershipRequest",
        entityId: request._id,
        metadata: { fpoId: fpo.id },
      }, "audit"),
    ]);
    emit(req, "notification:new", { userId: fpo.userId, type: "FPO_MEMBERSHIP_REQUEST", request });
    ok(res, request);
  }),
);
router.patch(
  "/fpo/membership-requests/:id",
  requireAuth,
  allowRoles("fpo_manager"),
  validate(membershipReviewSchema),
  asyncHandler(async (req, res) => {
    const membershipRequest = await store.get("fpoMembershipRequests", req.params.id);
    if (!membershipRequest) throw new HttpError(404, "Membership request not found");
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    if (!managedFpo || membershipRequest.fpoId !== managedFpo.id)
      throw new HttpError(403, "You can review requests only for your FPO");
    if (membershipRequest.status !== "PENDING")
      throw new HttpError(409, "This membership request has already been reviewed");
    const status = req.body.action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await store.update("fpoMembershipRequests", membershipRequest._id, {
      status,
      managerNote: req.body.note,
      reviewedBy: req.user.sub,
      reviewedAt: new Date().toISOString(),
    });
    if (status === "APPROVED") {
      const existingMember = (await store.list("members")).find(
        (member) => member.fpoId === managedFpo.id && member.userId === membershipRequest.farmerId,
      );
      if (!existingMember)
        await store.create("members", {
          fpoId: managedFpo.id,
          userId: membershipRequest.farmerId,
          farmer: membershipRequest.farmerName,
          farmName: membershipRequest.farmName,
          location: membershipRequest.location,
          lotId: "No contribution yet",
          product: "No contribution yet",
          grade: "—",
          availableQuantity: 0,
          selectedQuantity: 0,
          status: "ACTIVE",
          joinedAt: new Date().toISOString(),
        }, "member");
    }
    await Promise.all([
      store.create("notifications", {
        userId: membershipRequest.farmerId,
        title: `FPO membership ${status.toLowerCase()}`,
        message: status === "APPROVED" ? `${managedFpo.name} approved your membership request.` : `${managedFpo.name} did not approve your membership request.`,
        type: "FPO_MEMBERSHIP_UPDATED",
        entityId: membershipRequest._id,
        read: false,
      }, "note"),
      store.create("auditLogs", {
        actorId: req.user.sub,
        action: `FPO_MEMBERSHIP_${status}`,
        entityType: "FPOMembershipRequest",
        entityId: membershipRequest._id,
        metadata: { farmerId: membershipRequest.farmerId, fpoId: managedFpo.id },
      }, "audit"),
    ]);
    emit(req, "notification:new", { userId: membershipRequest.farmerId, type: "FPO_MEMBERSHIP_UPDATED", request: updated });
    ok(res, updated);
  }),
);
router.post(
  "/fpo/aggregations",
  requireAuth,
  allowRoles("fpo_manager"),
  asyncHandler(async (req, res) => {
    const selected = req.body.contributions || [];
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    if (!managedFpo) throw new HttpError(404, "Managed FPO profile not found");
    const members = await store.list("members", { fpoId: managedFpo.id });
    const contributions = selected.map((s) => {
      const m = members.find((x) => x._id === s.memberId);
      if (!m || s.quantity > m.availableQuantity)
        throw new HttpError(
          409,
          "A selected member lot does not have enough compatible quantity",
        );
      if (m.product !== req.body.product || m.grade !== req.body.grade)
        throw new HttpError(
          409,
          "Incompatible product or grade cannot be aggregated",
        );
      return { ...m, selectedQuantity: s.quantity };
    });
    const aggregation = await store.create(
      "aggregations",
      {
        fpoId: managedFpo.id,
        product: req.body.product,
        grade: req.body.grade,
        totalQuantity: contributions.reduce(
          (n, c) => n + c.selectedQuantity,
          0,
        ),
        contributions,
        status: "DRAFT",
      },
      "aggregation",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "FPO_AGGREGATION_CREATED",
        entityType: "Aggregation",
        entityId: aggregation._id,
      },
      "audit",
    );
    ok(res, aggregation);
  }),
);
router.get(
  "/fpo/settlements",
  requireAuth,
  allowRoles("fpo_manager"),
  asyncHandler(async (req, res) => {
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    ok(res, managedFpo ? await store.list("settlements", { fpoId: managedFpo.id }) : []);
  }),
);

router.get(
  "/shipments",
  requireAuth,
  allowRoles("driver", "logistics_partner", "logistics", "admin"),
  asyncHandler(async (req, res) => {
    const shipments = await store.list("shipments", req.user.role === "driver" ? { driverUserId: req.user.sub } : {});
    const optimized = await Promise.all(shipments.map((shipment) => (
      shipment.status !== "DELIVERED" && shipment.routeOptimization?.version !== 2
        ? optimizeStoredShipment(shipment, "AUTOMATIC_ACCESS")
        : shipment
    )));
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
    const optimized = shipment.status !== "DELIVERED" && shipment.routeOptimization?.version !== 2
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
    const opportunities = findLoadOpportunities(shipment, await store.list("shipments"));
    ok(res, {
      shipmentId: shipment._id,
      remainingCapacity: Math.max(0, Number(shipment.capacity || 0) - Number(shipment.load || 0)),
      opportunities,
      rules: "In-transit only · remaining capacity · cold-chain compatible · maximum 50% route detour",
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
    if ((shipment.loadOffers || []).some((offer) => offer.candidateShipmentId === candidate._id && offer.status === "PENDING_DRIVER"))
      throw new HttpError(409, "This load is already awaiting a response");
    const opportunity = findLoadOpportunities(shipment, [candidate])[0];
    if (!opportunity) {
      const evaluation = evaluateLoadOpportunity(shipment, candidate);
      throw new HttpError(409, evaluation.reasons.join(". ") || "This load is not compatible with the active trip");
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
      status: "PENDING_DRIVER",
      proposedBy: req.user.sub,
      proposedAt: new Date().toISOString(),
    };
    const updated = await store.update("shipments", shipment._id, {
      loadOffers: [...(shipment.loadOffers || []), offer],
      timeline: [...(shipment.timeline || []), `${candidate.load}kg in-transit load offered for driver review`],
    });
    await store.update("shipments", candidate._id, {
      status: "LOAD_OFFERED",
      loadOfferTo: shipment._id,
      loadOfferId: offer.id,
    });
    await Promise.all([
      shipment.driverUserId ? store.create("notifications", {
        userId: shipment.driverUserId,
        title: "Compatible load available on your route",
        message: `${offer.addedLoad}kg · ${offer.detourKm}km estimated detour · review before accepting.`,
        type: "IN_TRANSIT_LOAD_OFFER",
        entityId: shipment._id,
        read: false,
      }, "note") : Promise.resolve(),
      store.create("auditLogs", {
        actorId: req.user.sub,
        action: "IN_TRANSIT_LOAD_OFFERED",
        entityType: "Shipment",
        entityId: shipment._id,
        metadata: { offerId: offer.id, candidateShipmentId: candidate._id, addedLoad: offer.addedLoad, detourKm: offer.detourKm },
      }, "audit"),
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
      assertShipmentAccess(req, shipment, "Drivers can respond only to loads offered to their assigned trip");
      const offer = (shipment.loadOffers || []).find((candidateOffer) => candidateOffer.id === req.params.offerId);
      if (!offer) throw new HttpError(404, "Load offer not found");
      if (offer.status !== "PENDING_DRIVER") throw new HttpError(409, "This load offer has already been answered");
      const candidate = await store.get("shipments", offer.candidateShipmentId, session);
      if (!candidate) throw new HttpError(404, "Additional load is no longer available");
      if (req.body.action === "DECLINE") {
        const respondedAt = new Date().toISOString();
        const loadOffers = shipment.loadOffers.map((candidateOffer) => candidateOffer.id === offer.id ? {
          ...candidateOffer,
          status: "DECLINED",
          responseNote: req.body.note,
          respondedAt,
          respondedBy: req.user.sub,
          respondedByRole: req.user.role,
        } : candidateOffer);
        const updated = await store.update("shipments", shipment._id, {
          loadOffers,
          timeline: [...(shipment.timeline || []), `${candidate.load}kg in-transit load declined`],
        }, session);
        const availableCandidate = await store.update("shipments", candidate._id, { status: "PLANNED", loadOfferTo: null, loadOfferId: null }, session);
        return { shipment: updated, candidate: availableCandidate, offer: loadOffers.find((item) => item.id === offer.id) };
      }
      const merged = mergeAcceptedLoad(shipment, candidate, offer.id, req.user);
      if (!merged.shipment)
        throw new HttpError(409, merged.evaluation.reasons.join(". ") || "The load no longer fits this trip");
      const changes = { ...merged.shipment };
      delete changes._id;
      delete changes.createdAt;
      delete changes.updatedAt;
      const updated = await store.update("shipments", shipment._id, changes, session);
      const mergedCandidate = await store.update("shipments", candidate._id, {
        status: "MERGED_IN_TRANSIT",
        dispatchRequired: false,
        mergedIntoShipmentId: shipment._id,
        mergedAt: new Date().toISOString(),
        loadOfferTo: shipment._id,
      }, session);
      return { shipment: updated, candidate: mergedCandidate, offer: updated.loadOffers.find((item) => item.id === offer.id), evaluation: merged.evaluation };
    });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: req.body.action === "ACCEPT" ? "IN_TRANSIT_LOAD_ACCEPTED" : "IN_TRANSIT_LOAD_DECLINED",
      entityType: "Shipment",
      entityId: req.params.id,
      metadata: { offerId: req.params.offerId, candidateShipmentId: result.candidate._id, newLoad: result.shipment.load },
    }, "audit");
    const dispatchers = (await store.list("users")).filter((user) =>
      ["logistics_partner", "logistics"].includes(user.role) && accountStatusOf(user) === "ACTIVE" && user._id !== req.user.sub,
    );
    const responseLabel = req.body.action === "ACCEPT" ? "accepted" : "declined";
    await Promise.all(dispatchers.map((dispatcher) => store.create("notifications", {
      userId: dispatcher._id,
      title: `In-transit load ${responseLabel}`,
      message: `${result.candidate.load}kg load for ${result.shipment._id} was ${responseLabel}.`,
      type: "IN_TRANSIT_LOAD_RESPONSE",
      entityId: result.shipment._id,
      read: false,
    }, "note")));
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
      req.user.role === "driver" ? "DRIVER_RECALCULATION" : "FLEET_RECALCULATION",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "SHIPMENT_ROUTE_OPTIMIZED",
        entityType: "Shipment",
        entityId: shipment._id,
        metadata: { distance: updated.distance, trigger: updated.routeOptimization?.trigger },
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
    if (!["AVAILABLE", "IDLE"].includes(vehicle.status) && vehicle.shipmentId !== shipment._id)
      throw new HttpError(409, "This vehicle is already assigned or unavailable");
    if (Number(vehicle.capacity) < Number(shipment.load))
      throw new HttpError(409, `Vehicle capacity is ${vehicle.capacity}kg, below this ${shipment.load}kg load`);
    if (shipment.coldChainRequired && !vehicle.coldChain)
      throw new HttpError(409, "Choose a cold-chain vehicle for this shipment");
    const activeDrivers = users.filter((user) => user.role === "driver" && accountStatusOf(user) === "ACTIVE");
    const driver = activeDrivers.find((user) => user._id === vehicle.driverUserId && (!user.currentShipmentId || user.currentShipmentId === shipment._id))
      || activeDrivers.find((user) => !user.currentShipmentId || user.currentShipmentId === shipment._id);
    if (!driver) throw new HttpError(409, "No active verified driver is available for this vehicle");
    if (shipment.vehicleId && shipment.vehicleId !== vehicle._id)
      await store.update("vehicles", shipment.vehicleId, { status: "AVAILABLE", shipmentId: null });
    await Promise.all([
      store.update("vehicles", vehicle._id, { status: "ASSIGNED", shipmentId: shipment._id }),
      store.update("users", driver._id, { currentShipmentId: shipment._id }),
    ]);
    const assigned = await store.update("shipments", shipment._id, {
      vehicleId: vehicle._id,
      vehicle: `${vehicle.registration} · ${vehicle.type}`,
      driverUserId: driver._id,
      driver: driver.name,
      phone: driver.phone ? `•••• ${String(driver.phone).slice(-4)}` : "Protected",
      capacity: vehicle.capacity,
      coldChain: Boolean(vehicle.coldChain),
      status: "READY_FOR_PICKUP",
      dispatchRequired: false,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: req.user.sub,
      timeline: [...(shipment.timeline || []), "Vehicle and driver auto-dispatched"],
    });
    const updated = await optimizeStoredShipment(assigned, "FLEET_DISPATCH");
    await Promise.all([
      store.create("notifications", {
        userId: driver._id,
        title: "Trip dispatched to you",
        message: `${updated.load}kg · ${updated.stops.length} stops · next: ${updated.nextStop?.label}.`,
        type: "SHIPMENT_ASSIGNED",
        entityId: updated._id,
        read: false,
      }, "note"),
      store.create("auditLogs", {
        actorId: req.user.sub,
        action: "SHIPMENT_AUTO_DISPATCHED",
        entityType: "Shipment",
        entityId: updated._id,
        metadata: { vehicleId: vehicle._id, driverId: driver._id, distance: updated.distance },
      }, "audit"),
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
    assertShipmentAccess(req, shipment, "Drivers can start only their assigned shipments");
    if (!shipment.driverUserId || !shipment.vehicleId && shipment.dispatchRequired)
      throw new HttpError(409, "A verified driver and vehicle must be assigned before starting");
    if (shipment.status === "DELIVERED") throw new HttpError(409, "This shipment is already delivered");
    const prepared = shipment.routeOptimization?.version === 2
      ? shipment
      : await optimizeStoredShipment(shipment, "TRIP_START");
    const updated = await store.update("shipments", shipment._id, {
      status: "IN_TRANSIT",
      startedAt: prepared.startedAt || new Date().toISOString(),
      timeline: [...(prepared.timeline || []), "Driver started optimized trip"],
    });
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "SHIPMENT_TRIP_STARTED",
      entityType: "Shipment",
      entityId: shipment._id,
      metadata: { nextStop: updated.nextStop?.label },
    }, "audit");
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
    assertShipmentAccess(req, shipment, "Drivers can update only their assigned shipments");
    const prepared = shipment.routeOptimization?.version === 2
      ? shipment
      : await optimizeStoredShipment(shipment, "STOP_WORKFLOW_OPENED");
    const targetIndex = prepared.stops.findIndex((stop) => (
      stop.id === req.params.stop || String(stop.sequence) === req.params.stop
    ));
    if (targetIndex < 0) throw new HttpError(404, "Route stop not found");
    const target = prepared.stops[targetIndex];
    if (target.status === "COMPLETED") throw new HttpError(409, "This route stop is already complete");
    if (target.status !== "NEXT") throw new HttpError(409, `Complete ${prepared.nextStop?.label || "the next stop"} first`);
    const stops = prepared.stops.map((stop, index) => index === targetIndex ? {
      ...stop,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      completedBy: req.user.sub,
      completedQuantity: req.body.quantity ?? stop.quantity,
      completionNotes: req.body.notes,
    } : stop);
    const allComplete = stops.every((stop) => stop.status === "COMPLETED");
    const advanced = await store.update("shipments", shipment._id, {
      stops,
      status: allComplete ? "DELIVERED" : "IN_TRANSIT",
      deliveredAt: allComplete ? new Date().toISOString() : undefined,
      timeline: [...(prepared.timeline || []), `${target.type.toLowerCase()} completed · ${target.label}`],
    });
    const updated = allComplete ? advanced : await optimizeStoredShipment(advanced, "STOP_COMPLETED");
    if (allComplete) {
      if (updated.vehicleId) await store.update("vehicles", updated.vehicleId, { status: "AVAILABLE", shipmentId: null });
      if (updated.driverUserId) await store.update("users", updated.driverUserId, { currentShipmentId: null });
    }
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: "SHIPMENT_STOP_COMPLETED",
      entityType: "Shipment",
      entityId: shipment._id,
      metadata: { stopType: target.type, stopLabel: target.label, allComplete },
    }, "audit");
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
    assertShipmentAccess(req, shipment, "Drivers can report issues only for their assigned shipments");
    const issue = { id: id("issue"), ...req.body, reportedBy: req.user.sub, reportedAt: new Date().toISOString(), status: "OPEN" };
    const updated = await store.update("shipments", shipment._id, {
      issues: [...(shipment.issues || []), issue],
      status: "DELAYED",
      timeline: [...(shipment.timeline || []), `${req.body.severity.toLowerCase()} ${req.body.type.toLowerCase()} issue reported`],
    });
    const dispatchers = (await store.list("users")).filter((user) =>
      ["logistics_partner", "logistics"].includes(user.role) && accountStatusOf(user) === "ACTIVE" && user._id !== req.user.sub,
    );
    await Promise.all([
      ...dispatchers.map((dispatcher) => store.create("notifications", {
        userId: dispatcher._id,
        title: `${req.body.severity} shipment issue`,
        message: `${shipment._id}: ${req.body.message}`,
        type: "SHIPMENT_ISSUE",
        entityId: shipment._id,
        read: false,
      }, "note")),
      store.create("auditLogs", {
        actorId: req.user.sub,
        action: "SHIPMENT_ISSUE_REPORTED",
        entityType: "Shipment",
        entityId: shipment._id,
        metadata: { issueId: issue.id, type: issue.type, severity: issue.severity },
      }, "audit"),
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
    assertShipmentAccess(req, shipment, "Drivers can update only their assigned shipments");
    const completedAt = new Date().toISOString();
    const stops = shipment.stops.map((stop) => stop.type === "PICKUP" ? { ...stop, status: "COMPLETED", completedAt, completedBy: req.user.sub } : stop);
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
    const optimized = await optimizeStoredShipment(updated, "PROOF_OF_PICKUP");
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
    assertShipmentAccess(req, shipment, "Drivers can update only their assigned shipments");
    const completedAt = new Date().toISOString();
    const updated = await store.update("shipments", req.params.id, {
      status: "DELIVERED",
      stops: shipment.stops.map((stop) => stop.type === "DELIVERY" ? { ...stop, status: "COMPLETED", completedAt, completedBy: req.user.sub } : stop),
      deliveredAt: completedAt,
      proofOfDelivery: {
        timestamp: new Date().toISOString(),
        receiverName: req.body.receiverName,
        acceptedQuantity: req.body.acceptedQuantity,
        rejectedQuantity: req.body.rejectedQuantity || 0,
        notes: req.body.notes,
      },
    });
    if (updated.vehicleId) await store.update("vehicles", updated.vehicleId, { status: "AVAILABLE", shipmentId: null });
    if (updated.driverUserId) await store.update("users", updated.driverUserId, { currentShipmentId: null });
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
  asyncHandler(async (req, res) => ok(res, await store.list("vehicles", req.user.role === "driver" ? { driverUserId: req.user.sub } : {}))),
);
router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) =>
    ok(res, await store.list("notifications", { userId: req.user.sub })),
  ),
);
router.patch(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await store.get("notifications", req.params.id);
    if (!notification) throw new HttpError(404, "Notification not found");
    if (notification.userId !== req.user.sub)
      throw new HttpError(403, "You do not have access to this notification");
    ok(res, await store.update("notifications", req.params.id, { read: true }));
  }),
);
router.get(
  "/disputes",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => ok(res, await store.list("disputes"))),
);
router.post(
  "/disputes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dispute = await store.create(
      "disputes",
      {
        ...req.body,
        openedBy: req.user.name,
        status: "OPEN",
        severity: "MEDIUM",
        timeline: [{ label: "Dispute opened", date: new Date().toISOString() }],
      },
      "dispute",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "DISPUTE_OPENED",
        entityType: "Dispute",
        entityId: dispute._id,
      },
      "audit",
    );
    ok(res, dispute);
  }),
);
router.patch(
  "/disputes/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const dispute = await store.update("disputes", req.params.id, {
      status: req.body.status,
      adminNotes: req.body.adminNotes,
      resolution: req.body.resolution,
    });
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "DISPUTE_UPDATED",
        entityType: "Dispute",
        entityId: req.params.id,
        metadata: { status: req.body.status },
      },
      "audit",
    );
    ok(res, dispute);
  }),
);
router.get(
  "/admin/verifications",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const [profiles, users, documents] = await Promise.all([
      store.list("verificationProfiles"),
      store.list("users"),
      store.list("verificationDocuments"),
    ]);
    const requestedStatus = String(req.query.status || "").toUpperCase();
    const requestedRole = String(req.query.role || "").toLowerCase();
    const queue = profiles
      .filter((profile) => !requestedStatus || profile.overallStatus === requestedStatus)
      .filter((profile) => !requestedRole || profile.role === requestedRole)
      .map((profile) => {
        const applicant = users.find((user) => user._id === profile.userId);
        return {
          ...profile,
          applicant: applicant ? cleanUser(applicant) : null,
          documents: documents
            .filter((document) => document.ownerId === profile.userId)
            .map(cleanVerificationDocument),
        };
      })
      .sort((a, b) => new Date(b.submittedAt || b.updatedAt) - new Date(a.submittedAt || a.updatedAt));
    ok(res, queue);
  }),
);
router.get(
  "/admin/verifications/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const profile = await store.get("verificationProfiles", req.params.id);
    if (!profile) throw new HttpError(404, "Verification application not found");
    const [applicant, documents, reviews] = await Promise.all([
      store.get("users", profile.userId),
      store.list("verificationDocuments", { ownerId: profile.userId }),
      store.list("verificationReviews", { profileId: profile._id }),
    ]);
    ok(res, {
      ...profile,
      applicant: applicant ? cleanUser(applicant) : null,
      documents: documents.map(cleanVerificationDocument),
      reviews,
    });
  }),
);
router.patch(
  "/admin/verifications/:id/review",
  requireAuth,
  allowRoles("admin"),
  validate(verificationReviewSchema),
  asyncHandler(async (req, res) => {
    const profile = await store.get("verificationProfiles", req.params.id);
    if (!profile) throw new HttpError(404, "Verification application not found");
    const applicant = await store.get("users", profile.userId);
    if (!applicant) throw new HttpError(404, "Applicant account not found");
    const transitions = {
      APPROVE: { accountStatus: "ACTIVE", verificationStatus: "APPROVED", verified: true, overallStatus: "APPROVED" },
      REQUEST_CHANGES: { accountStatus: "CHANGES_REQUESTED", verificationStatus: "CHANGES_REQUESTED", verified: false, overallStatus: "CHANGES_REQUESTED" },
      REJECT: { accountStatus: "REJECTED", verificationStatus: "REJECTED", verified: false, overallStatus: "REJECTED" },
      SUSPEND: { accountStatus: "SUSPENDED", verificationStatus: "SUSPENDED", verified: false, overallStatus: "SUSPENDED" },
      REACTIVATE: { accountStatus: "ACTIVE", verificationStatus: "APPROVED", verified: true, overallStatus: "APPROVED" },
    };
    const transition = transitions[req.body.action];
    const now = new Date().toISOString();
    const updatedUser = await store.update("users", applicant._id, {
      accountStatus: transition.accountStatus,
      verificationStatus: transition.verificationStatus,
      verified: transition.verified,
    });
    const updatedProfile = await store.update("verificationProfiles", profile._id, {
      overallStatus: transition.overallStatus,
      approvedAt: transition.overallStatus === "APPROVED" ? now : profile.approvedAt,
      approvedBy: transition.overallStatus === "APPROVED" ? req.user.sub : profile.approvedBy,
      rejectionReasonCode: req.body.reasonCode || "",
      adminNote: req.body.note || "",
    });
    const review = await store.create("verificationReviews", {
      profileId: profile._id,
      applicantId: applicant._id,
      reviewerId: req.user.sub,
      action: req.body.action,
      reasonCode: req.body.reasonCode,
      note: req.body.note,
      previousStatus: profile.overallStatus,
      nextStatus: transition.overallStatus,
    }, "review");
    await store.create("auditLogs", {
      actorId: req.user.sub,
      action: `VERIFICATION_${req.body.action}`,
      entityType: "VerificationProfile",
      entityId: profile._id,
      metadata: {
        applicantId: applicant._id,
        previousStatus: profile.overallStatus,
        nextStatus: transition.overallStatus,
        reasonCode: req.body.reasonCode,
      },
    }, "audit");
    await store.create("notifications", {
      userId: applicant._id,
      title: "Verification status updated",
      message: req.body.note || `Your application is now ${transition.overallStatus.replaceAll("_", " ").toLowerCase()}.`,
      type: "VERIFICATION",
      entityId: profile._id,
      read: false,
    }, "notification");
    emit(req, "verification:updated", { userId: applicant._id, status: transition.accountStatus });
    ok(res, { ...updatedProfile, applicant: cleanUser(updatedUser), review });
  }),
);
router.get(
  "/admin/audit",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => ok(res, await store.list("auditLogs"))),
);
router.get(
  "/analytics/overview",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const [allOrders, allLots, allHarvests, allShipments, sellers, subFulfillments] = await Promise.all(
      ["orders", "lots", "expectedHarvests", "shipments", "sellers", "subFulfillments"].map((key) => store.list(key)),
    );
    const seller = sellerForUser(sellers, req.user.sub);
    const sellerSuborders = req.user.role === "admin" || !seller
      ? []
      : subFulfillments.filter((suborder) => suborder.sellerId === seller.id);
    const scopedOrderIds = req.user.role === "admin"
      ? new Set(allOrders.map((order) => order._id))
      : new Set([
        ...allOrders.filter((order) => order.sellerId === seller?.id).map((order) => order._id),
        ...sellerSuborders.map((suborder) => suborder.orderId),
      ]);
    const orders = allOrders.filter((order) => scopedOrderIds.has(order._id));
    const lots = req.user.role === "admin" ? allLots : allLots.filter((lot) => lot.sellerId === seller?.id);
    const harvests = req.user.role === "admin" ? allHarvests : allHarvests.filter((harvest) => [seller?.id, req.user.sub].includes(harvest.sellerId));
    const shipments = allShipments.filter((shipment) => shipmentBelongsToOrders(shipment, scopedOrderIds));
    const revenue = req.user.role === "admin"
      ? orders.reduce((total, order) => total + (order.total || 0), 0)
      : sellerSuborders.length
        ? sellerSuborders.reduce((total, suborder) => total + (suborder.subtotal || 0), 0)
        : orders.reduce((total, order) => total + (order.total || 0), 0);
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (5 - index), 1);
      const matching = orders.filter((order) => {
        const created = new Date(order.createdAt || 0);
        return created.getFullYear() === month.getFullYear() && created.getMonth() === month.getMonth();
      });
      const orderRevenue = req.user.role !== "admin" && sellerSuborders.length
        ? sellerSuborders.filter((suborder) => matching.some((order) => order._id === suborder.orderId)).reduce((total, suborder) => total + (suborder.subtotal || 0), 0)
        : matching.reduce((total, order) => total + (order.total || 0), 0);
      return { month: month.toLocaleString("en", { month: "short" }), revenue: orderRevenue, retail: matching.filter((order) => order.type !== "BULK").length, bulk: matching.filter((order) => order.type === "BULK").length };
    });
    ok(res, {
      revenue,
      orders: orders.length,
      inventory: lots.reduce((n, l) => n + (l.availableQuantity || 0), 0),
      reservedBeforeHarvest: harvests.reduce(
        (n, h) => n + (h.reservedQuantity || 0),
        0,
      ),
      surplusRescued: lots.filter((lot) => lot.freshnessState === "SELL_SOON").reduce((total, lot) => total + (lot.availableQuantity || 0), 0),
      expiredQuantity: lots.filter((lot) => lot.freshnessState === "EXPIRED").reduce((total, lot) => total + (lot.availableQuantity || 0), 0),
      referenceDelta: 0,
      onTimeFulfillment: shipments.length ? Math.round((shipments.filter((shipment) => shipment.status !== "DELAYED").length / shipments.length) * 100) : 0,
      vehicleUtilization: shipments.length ? Math.round(shipments.reduce((total, shipment) => total + (shipment.utilization || 0), 0) / shipments.length) : 0,
      monthly,
    });
  }),
);

export default router;
