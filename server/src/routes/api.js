import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { store } from "../services/dataStore.js";
import {
  scoreCandidates,
  buildFulfillmentPlan,
  distanceKm,
} from "../services/matching.js";
import {
  fetchMandiBenchmarks,
  priceRecommendation,
} from "../services/priceIntelligence.js";
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
import {
  audioUpload,
  upload,
  verificationUpload,
} from "../middleware/upload.js";
import { registerUrbanStoreRoutes } from "./urbanStores.js";
import { registerLogisticsRoutes } from "./logistics.js";
import { registerBulkProcurementRoutes } from "./bulkProcurement.js";
import { registerRecurringProcurementRoutes } from "./recurringProcurement.js";

const router = Router();
const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);
const refreshCookieOptions = {
  httpOnly: true,
  // The frontend and API use different Vercel domains in production, so the
  // refresh cookie must be explicitly cross-site. Local development remains
  // strict enough for http://localhost.
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  secure: env.nodeEnv === "production",
  path: "/api/v1/auth",
};
const accountStatusOf = (user) =>
  user?.accountStatus || (user?.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");
const verificationStatusOf = (user) =>
  user?.verificationStatus || (user?.verified ? "APPROVED" : "PENDING");
const cleanUser = (user) => {
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.refreshTokenHash;
  delete safe.password;
  safe.accountStatus = accountStatusOf(user);
  safe.verificationStatus = verificationStatusOf(user);
  return safe;
};
const cleanVerificationDocument = ({
  secureFileKey: _secureFileKey,
  ...document
}) => document;
/** Origin this API is reachable at. Behind a proxy `trust proxy` makes req.protocol honest. */
const publicOrigin = (req) =>
  env.publicUrl || `${req.protocol}://${req.get("host")}`;
/**
 * Persists an uploaded image and returns an ABSOLUTE url. Absolute matters: the
 * client is served from a different origin in production, so a root-relative
 * `/uploads/x.png` would resolve against the frontend, which rewrites unknown
 * paths to index.html — the browser then silently fails to decode HTML as an
 * image, which is exactly how "the image is not set" presents.
 */
const saveUploadedImage = async (req) => {
  const record = await store.create(
    "uploadedFiles",
    {
      ownerId: req.user.sub,
      mimeType: req.file.mimetype,
      size: req.file.size,
      originalName: String(req.file.originalname || "").slice(0, 120),
      data: req.file.buffer.toString("base64"),
    },
    "file",
  );
  return {
    fileId: record._id,
    url: `${publicOrigin(req)}/api/v1/files/${record._id}`,
  };
};
/**
 * `products[].seller` is a snapshot denormalised at create time and nothing
 * refreshes it, so a new avatar has to be pushed onto the seller's product cards
 * too — otherwise the marketplace keeps showing the old or missing photo.
 */
const applySellerImage = async (userId, image) => {
  const seller = (await store.list("sellers")).find(
    (item) => item.userId === userId,
  );
  if (!seller) return;
  await store.update("sellers", seller._id || seller.id, { image });
  // Product.sellerId is populated from either key depending on how the seller
  // record was created, so match on both rather than trusting one.
  const keys = [seller._id, seller.id].filter(Boolean);
  const products = (await store.list("products")).filter((product) =>
    keys.includes(product.sellerId),
  );
  await Promise.all(
    products.map((product) =>
      store.update("products", product._id, {
        seller: { ...(product.seller || {}), image },
      }),
    ),
  );
};
const sellerForUser = (sellers, userId) =>
  sellers.find((seller) => seller.userId === userId) || null;
/**
 * Inline SVG rather than a CDN photo: the previous default pointed at
 * images.unsplash.com, so every listing without its own picture went blank on a
 * firewalled venue network or offline demo. This one always renders.
 */
const fallbackProduceImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 120 90">' +
      '<rect width="120" height="90" fill="#eef4ec"/>' +
      '<path d="M30 64c22-2 34-19 54-37 0 32-15 56-44 56-5 0-10-2-12-7 12-10 24-19 41-29-19 7-29 12-39 17z" fill="#a7d65b"/>' +
      "</svg>",
  );
const shipmentBelongsToOrders = (shipment, orderIds) =>
  (shipment.orderIds || (shipment.orderId ? [shipment.orderId] : [])).some(
    (orderId) => orderIds.has(orderId),
  );
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
  role: z.enum([
    "consumer",
    "business_buyer",
    "farmer",
    "fpo_manager",
    "driver",
    "logistics_partner",
  ]),
  organization: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  locationCoordinates: z
    .tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)])
    .nullable()
    .optional(),
  locationSource: z.enum(["MANUAL", "GPS", "REVERSE_GEOCODED"]).optional(),
  preferredLanguage: z.enum(["en", "hi", "or"]).default("en"),
});
const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+ ()-]{10,16}$/, "Enter a valid phone number")
      .optional(),
    organization: z.string().trim().max(120).optional().default(""),
    location: z.string().trim().min(2).max(80).optional(),
    locationCoordinates: z
      .tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)])
      .nullable()
      .optional(),
    locationSource: z.enum(["MANUAL", "GPS", "REVERSE_GEOCODED"]).optional(),
  })
  .strict();
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
/**
 * Editing a listing was impossible before — there was no update route at all, so
 * a product saved with a broken or empty image could never be corrected without
 * recreating it. Every field is optional so the client can PATCH just the image.
 */
const productUpdateSchema = productSchema.partial().extend({
  status: z.enum(["active", "paused"]).optional(),
});
const verificationReviewSchema = z
  .object({
    action: z.enum([
      "APPROVE",
      "REQUEST_CHANGES",
      "REJECT",
      "SUSPEND",
      "REACTIVATE",
    ]),
    reasonCode: z.string().trim().max(80).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    if (
      ["REQUEST_CHANGES", "REJECT", "SUSPEND"].includes(value.action) &&
      !value.note
    )
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a review note for this action",
      });
    if (value.action === "REJECT" && !value.reasonCode)
      context.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "Choose a rejection reason",
      });
  });
const membershipRequestSchema = z.object({
  fpoId: z.string().min(2),
  message: z.string().trim().max(500).optional().default(""),
});
const membershipReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional().default(""),
});
/**
 * Reviews are deliberately forgiving: a star rating alone is a valid review.
 * Requiring written text would exclude the low-literacy farmers and buyers this
 * marketplace is built for, so `comment` is always optional and tags carry the
 * structured signal instead.
 */
const orderReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(8).optional().default([]),
  productRatings: z
    .array(
      z.object({
        productId: z.string().min(1),
        rating: z.coerce.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional().default(""),
      }),
    )
    .max(30)
    .optional()
    .default([]),
});
const platformFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(8).optional().default([]),
  orderId: z.string().trim().max(60).optional().default(""),
});
/**
 * A producer accepting or rejecting the lines of a retail order that belong to
 * them. The reason is optional on accept and surfaced to the buyer on reject.
 */
const sellerResponseSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().trim().max(300).optional().default(""),
});
/** Sellers are referenced by `id` in some records and `_id` in others. */
const sellerKeys = (seller) => [seller?._id, seller?.id].filter(Boolean);
const averageRating = (rows) =>
  rows.length
    ? Number(
        (
          rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) /
          rows.length
        ).toFixed(2),
      )
    : 0;
/**
 * Seeded products and sellers ship with a plausible rating and review count for
 * the demo. Recomputing purely from the Review collection would make the first
 * real review crash a 4.8/243 seller down to a single number, so the seeded
 * figures are frozen once as a baseline and real reviews are blended in from
 * there. Capturing the baseline is idempotent — it only ever happens once.
 */
const blendRating = (record, reviews) => {
  const baseline = record.ratingBaseline || {
    rating: Number(record.rating) || 0,
    reviews: Number(record.reviews) || 0,
  };
  const liveTotal = reviews.reduce(
    (sum, row) => sum + Number(row.rating || 0),
    0,
  );
  const weight = baseline.reviews + reviews.length;
  return {
    ratingBaseline: baseline,
    reviews: weight,
    rating: weight
      ? Number(
          ((baseline.rating * baseline.reviews + liveTotal) / weight).toFixed(
            1,
          ),
        )
      : 0,
    liveReviews: reviews.length,
    liveRating: averageRating(reviews),
  };
};
const recomputeProductRating = async (productId) => {
  const product = await store.get("products", productId);
  if (!product) return null;
  const reviews = await store.list("reviews", { productId });
  const blended = blendRating(product, reviews);
  return store.update("products", product._id, blended);
};
const recomputeSellerRating = async (sellerId) => {
  const sellers = await store.list("sellers");
  const seller = sellers.find((candidate) =>
    sellerKeys(candidate).includes(sellerId),
  );
  if (!seller) return null;
  const keys = sellerKeys(seller);
  // Only seller-level reviews count toward the seller score; per-product reviews
  // roll up into the product rating instead so a multi-item order cannot let one
  // buyer move the seller average several times.
  const reviews = (await store.list("reviews", {})).filter(
    (review) => keys.includes(review.sellerId) && !review.productId,
  );
  const blended = blendRating(seller, reviews);
  const updated = await store.update(
    "sellers",
    seller._id || seller.id,
    blended,
  );
  // `products[].seller` is a denormalised snapshot rendered on every card.
  const products = (await store.list("products")).filter((product) =>
    keys.includes(product.sellerId),
  );
  await Promise.all(
    products.map((product) =>
      store.update("products", product._id, {
        seller: {
          ...(product.seller || {}),
          rating: blended.rating,
          reviews: blended.reviews,
        },
      }),
    ),
  );
  return updated;
};
/**
 * Which sellers can be reviewed for an order. Bulk orders carry `sellerId`
 * directly; retail orders have to be resolved through their line items.
 */
const sellersForOrder = async (order) => {
  const sellers = await store.list("sellers");
  const products = await store.list("products");
  const ids = new Set();
  if (order.sellerId) ids.add(order.sellerId);
  for (const item of order.items || []) {
    const product = products.find(
      (candidate) => candidate._id === item.productId,
    );
    if (product?.sellerId) ids.add(product.sellerId);
  }
  return [...ids]
    .map((sellerId) =>
      sellers.find((candidate) => sellerKeys(candidate).includes(sellerId)),
    )
    .filter(Boolean);
};

/** Items on an order that belong to one seller, by any of that seller's ids. */
const itemsForSeller = (order, seller) => {
  const keys = sellerKeys(seller);
  return (order.items || []).filter((item) => keys.includes(item.sellerId));
};
const sum = (rows, pick) =>
  rows.reduce((total, row) => total + Number(pick(row) || 0), 0);
/**
 * Derives the order's own state from its per-seller line decisions. A retail
 * order waits at PENDING_SELLER until every seller has answered; it then
 * confirms on the lines that were accepted, or cancels outright if every seller
 * said no. Rejected lines stay on the order (flagged) rather than being deleted
 * so the buyer can see what happened and why.
 */
const settleOrderApproval = (order) => {
  const items = order.items || [];
  const pending = items.filter(
    (item) => (item.approvalStatus || "PENDING") === "PENDING",
  );
  const accepted = items.filter((item) => item.approvalStatus === "ACCEPTED");
  if (pending.length) return { status: "PENDING_SELLER", settled: false };
  const subtotal = sum(accepted, (item) => item.price * item.quantity);
  // Free-delivery threshold is re-applied to the surviving lines, so a buyer is
  // never charged a fee that the original basket size had waived.
  const deliveryFee = accepted.length ? (subtotal >= 799 ? 0 : 49) : 0;
  return {
    settled: true,
    status: accepted.length ? "CONFIRMED" : "CANCELLED",
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
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
router.post(
  "/voice/transcribe",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  audioUpload.single("audio"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Attach an audio recording");
    if (!env.openAiApiKey)
      throw new HttpError(
        503,
        "Voice transcription provider is not configured",
      );
    const form = new FormData();
    form.append(
      "file",
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname || "crop-listing.webm",
    );
    form.append("model", "gpt-4o-mini-transcribe");
    if (req.body.language) form.append("language", String(req.body.language));
    form.append(
      "prompt",
      "Indian crop listing. Preserve crop names, quantities in kg, prices in rupees, grade, and location.",
    );
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.openAiApiKey}` },
        body: form,
      },
    );
    if (!response.ok)
      throw new HttpError(
        502,
        "Voice transcription provider could not process this recording",
      );
    const transcription = await response.json();
    ok(res, {
      text: transcription.text || "",
      provider: "OpenAI transcription",
      language: req.body.language || "auto",
    });
  }),
);
router.get(
  "/jobs/freshness",
  asyncHandler(async (req, res) => {
    const expected = env.cronSecret && `Bearer ${env.cronSecret}`;
    if (!expected || req.headers.authorization !== expected)
      throw new HttpError(401, "Invalid cron authorization");
    await refreshLotFreshness();
    ok(res, {
      status: "ok",
      job: "freshness",
      ranAt: new Date().toISOString(),
    });
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
        privacy:
          "Coordinates are used only to resolve the selected location and are not exposed publicly.",
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
    const stored = await saveUploadedImage(req);
    ok(res, {
      url: stored.url,
      fileId: stored.fileId,
      provider: providers.uploads.name,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  }),
);
/**
 * Public on purpose: these bytes are product photos and profile pictures that are
 * already rendered on unauthenticated marketplace pages, and an `<img>` tag
 * cannot send an Authorization header. Verification documents are deliberately
 * NOT served here.
 */
router.get(
  "/files/:id",
  asyncHandler(async (req, res) => {
    const file = await store.get("uploadedFiles", req.params.id);
    if (!file) throw new HttpError(404, "Image not found");
    const body = Buffer.from(file.data, "base64");
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Length", String(body.length));
    // Content is immutable — the id changes whenever the image does.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(body);
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
        accountStatus: automaticallyActive
          ? "ACTIVE"
          : "PENDING_ADMIN_APPROVAL",
        verificationStatus: automaticallyActive ? "APPROVED" : "PENDING",
      },
      "user",
    );
    await store.create(
      "verificationProfiles",
      {
        userId: user._id,
        role: user.role,
        overallStatus: automaticallyActive
          ? "APPROVED"
          : "PENDING_ADMIN_APPROVAL",
        submittedAt: new Date().toISOString(),
        approvedAt: automaticallyActive ? new Date().toISOString() : undefined,
        riskFlags: [],
        missingRequirements: verificationRequirements[user.role] || [],
        resubmissionCount: 0,
      },
      "verification",
    );
    await store.create(
      "auditLogs",
      {
        actorId: user._id,
        action: "VERIFICATION_SUBMITTED",
        entityType: "VerificationProfile",
        entityId: user._id,
        metadata: { role: user.role, automaticallyActive },
      },
      "audit",
    );
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
    const emailOwner = req.body.email
      ? await store.find("users", { email: req.body.email })
      : null;
    if (emailOwner && emailOwner._id !== req.user.sub)
      throw new HttpError(409, "An account with this email already exists");
    const updated = await store.update("users", req.user.sub, req.body);
    const seller = (await store.list("sellers")).find(
      (item) => item.userId === req.user.sub,
    );
    if (
      seller &&
      (req.body.location !== undefined ||
        req.body.locationCoordinates !== undefined)
    )
      await store.update("sellers", seller._id || seller.id, {
        ...(req.body.location !== undefined
          ? { location: req.body.location }
          : {}),
        ...(req.body.locationCoordinates !== undefined
          ? { coordinates: req.body.locationCoordinates }
          : {}),
      });
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "PROFILE_UPDATED",
        entityType: "User",
        entityId: req.user.sub,
        metadata: { fields: Object.keys(req.body) },
      },
      "audit",
    );
    emit(req, "profile:updated", { userId: req.user.sub });
    ok(res, { user: cleanUser(updated), accessToken: signAccess(updated) });
  }),
);
router.delete(
  "/products/:id",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const product = await store.get("products", req.params.id);
    if (!product) throw new HttpError(404, "Product not found");
    if (req.user.role !== "admin") {
      const seller = (await store.list("sellers")).find(
        (item) => item.userId === req.user.sub,
      );
      if (
        ![seller?._id, seller?.id, req.user.sub]
          .filter(Boolean)
          .includes(product.sellerId)
      )
        throw new HttpError(403, "You can only delete your own listings");
    }
    const hasOrder = (await store.list("orders")).some((order) =>
      (order.items || []).some((item) => item.productId === product._id),
    );
    if (hasOrder)
      throw new HttpError(
        409,
        "This listing has order history. Pause it instead of deleting it.",
      );
    await store.remove("products", product._id);
    emit(req, "product:deleted", { productId: product._id });
    ok(res, { deleted: true, productId: product._id });
  }),
);
router.post(
  "/auth/me/avatar",
  requireAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a profile image to upload");
    const { url: profileImage } = await saveUploadedImage(req);
    const updated = await store.update("users", req.user.sub, { profileImage });
    await applySellerImage(req.user.sub, profileImage);
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "PROFILE_IMAGE_UPDATED",
        entityType: "User",
        entityId: req.user.sub,
        metadata: { provider: providers.uploads.name },
      },
      "audit",
    );
    emit(req, "profile:updated", { userId: req.user.sub });
    ok(res, { user: cleanUser(updated), accessToken: signAccess(updated) });
  }),
);
router.delete(
  "/auth/me/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await store.update("users", req.user.sub, {
      profileImage: "",
    });
    await applySellerImage(req.user.sub, "");
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "PROFILE_IMAGE_REMOVED",
        entityType: "User",
        entityId: req.user.sub,
      },
      "audit",
    );
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
    let profile = await store.find("verificationProfiles", {
      userId: user._id,
    });
    if (!profile) {
      profile = await store.create(
        "verificationProfiles",
        {
          userId: user._id,
          role: user.role,
          overallStatus:
            accountStatusOf(user) === "ACTIVE"
              ? "APPROVED"
              : accountStatusOf(user),
          submittedAt: user.createdAt,
          approvedAt:
            accountStatusOf(user) === "ACTIVE" ? user.updatedAt : undefined,
          riskFlags: [],
          missingRequirements: verificationRequirements[user.role] || [],
          resubmissionCount: 0,
        },
        "verification",
      );
    }
    const documents = await store.list("verificationDocuments", {
      ownerId: user._id,
    });
    const reviews = await store.list("verificationReviews", {
      applicantId: user._id,
    });
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
    const documentType = String(req.body.documentType || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9_]{3,60}$/.test(documentType))
      throw new HttpError(400, "Choose a valid document type");
    const document = await store.create(
      "verificationDocuments",
      {
        ownerId: req.user.sub,
        documentType,
        documentNumberMasked: maskIdentifier(req.body.documentNumberMasked),
        secureFileKey: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: "PENDING",
        expiryDate: req.body.expiryDate || undefined,
      },
      "document",
    );
    const profile = await store.find("verificationProfiles", {
      userId: req.user.sub,
    });
    if (profile) {
      await store.update("verificationProfiles", profile._id, {
        missingRequirements: (profile.missingRequirements || []).filter(
          (requirement) => requirement !== documentType,
        ),
      });
    }
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "VERIFICATION_DOCUMENT_UPLOADED",
        entityType: "VerificationDocument",
        entityId: document._id,
        metadata: {
          documentType,
          mimeType: req.file.mimetype,
          size: req.file.size,
        },
      },
      "audit",
    );
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
      throw new HttpError(
        403,
        "A suspended account must be reviewed by an administrator",
      );
    if (currentStatus === "REJECTED")
      throw new HttpError(
        403,
        "This application was rejected and cannot be resubmitted without administrator review",
      );
    const profile = await store.find("verificationProfiles", {
      userId: req.user.sub,
    });
    if (!profile) throw new HttpError(404, "Verification profile not found");
    const resubmission = currentStatus === "CHANGES_REQUESTED";
    const updatedProfile = await store.update(
      "verificationProfiles",
      profile._id,
      {
        overallStatus: "PENDING_ADMIN_APPROVAL",
        submittedAt: new Date().toISOString(),
        adminNote: "",
        rejectionReasonCode: "",
        resubmissionCount:
          (profile.resubmissionCount || 0) + (resubmission ? 1 : 0),
      },
    );
    const updatedUser = await store.update("users", req.user.sub, {
      accountStatus: "PENDING_ADMIN_APPROVAL",
      verificationStatus: "PENDING",
      verified: false,
    });
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: resubmission
          ? "VERIFICATION_RESUBMITTED"
          : "VERIFICATION_SUBMITTED",
        entityType: "VerificationProfile",
        entityId: profile._id,
      },
      "audit",
    );
    emit(req, "verification:updated", {
      userId: req.user.sub,
      status: "PENDING_ADMIN_APPROVAL",
    });
    ok(res, {
      user: cleanUser(updatedUser),
      profile: updatedProfile,
      accessToken: signAccess(updatedUser),
    });
  }),
);

router.use(
  asyncHandler(async (req, _res, next) => {
    if (!req.user || req.user.role === "admin") return next();
    const publicBrowse =
      req.method === "GET" &&
      [
        /^\/products(?:\/|$)/,
        /^\/sellers(?:\/|$)/,
        /^\/quality-passports(?:\/|$)/,
        /^\/price-intelligence(?:\/|$)/,
      ].some((pattern) => pattern.test(req.path));
    if (publicBrowse) return next();
    const user = await store.get("users", req.user.sub);
    const accountStatus = accountStatusOf(user);
    if (accountStatus === "ACTIVE") return next();
    const error = new HttpError(
      403,
      "Complete account verification before using this feature",
      { accountStatus },
    );
    error.code = "ACCOUNT_NOT_ACTIVE";
    next(error);
  }),
);

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
        data.products = seller
          ? data.products.filter((product) => product.sellerId === seller.id)
          : [];
        data.lots = seller
          ? data.lots.filter((lot) => lot.sellerId === seller.id)
          : [];
      }
      if (req.user.role === "admin" || isProducer || canProcure) {
        const requirements = await store.list("requirements");
        data.requirements = canProcure
          ? requirements.filter((r) => r.buyerId === req.user.sub)
          : requirements;
      }
      if (req.user.role === "admin" || isProducer) {
        const harvests = await store.list("expectedHarvests");
        data.expectedHarvests =
          req.user.role === "admin"
            ? harvests
            : harvests.filter((h) =>
                [seller?.id, req.user.sub].includes(h.sellerId),
              );
      }
      if (req.user.role === "admin")
        data.quotations = await store.list("quotations");
      else if (isProducer && seller)
        data.quotations = await store.list("quotations", {
          sellerId: seller.id,
        });
      else if (canProcure) {
        const quotes = await store.list("quotations");
        data.quotations = quotes.filter((q) =>
          data.requirements.some((r) => r._id === q.requirementId),
        );
      }
      if (
        [
          "consumer",
          "business_buyer",
          "farmer",
          "fpo_manager",
          "admin",
        ].includes(req.user.role)
      ) {
        const orders = await store.list("orders");
        data.orders =
          req.user.role === "admin"
            ? orders
            : orders.filter(
                (o) => o.buyerId === req.user.sub || o.sellerId === seller?.id,
              );
      }
      if (
        ["driver", "logistics_partner", "logistics", "admin"].includes(
          req.user.role,
        )
      ) {
        const shipments = await store.list("shipments");
        data.shipments =
          req.user.role === "driver"
            ? shipments.filter(
                (shipment) => shipment.driverUserId === req.user.sub,
              )
            : shipments;
      } else if (isProducer) {
        const orderIds = new Set(data.orders.map((order) => order._id));
        data.shipments = (await store.list("shipments")).filter((shipment) =>
          shipmentBelongsToOrders(shipment, orderIds),
        );
      }
      data.notifications = await store.list("notifications", {
        userId: req.user.sub,
      });
      if (
        ["driver", "logistics_partner", "logistics", "admin"].includes(
          req.user.role,
        )
      )
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
        image: req.body.image?.trim() || fallbackProduceImage,
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
router.patch(
  "/products/:id",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await store.get("products", req.params.id);
    if (!product) throw new HttpError(404, "Product not found");
    if (req.user.role !== "admin") {
      const seller = (await store.list("sellers")).find(
        (item) => item.userId === req.user.sub,
      );
      const keys = [seller?._id, seller?.id, req.user.sub].filter(Boolean);
      if (!keys.includes(product.sellerId))
        throw new HttpError(403, "You can only edit your own listings");
    }
    const changes = { ...req.body };
    // An empty string here means "clear it", which would leave a blank card, so
    // fall back to the produce placeholder instead of storing nothing.
    if ("image" in changes && !changes.image.trim())
      changes.image = fallbackProduceImage;
    if (changes.name)
      changes.slug = changes.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const updated = await store.update("products", req.params.id, changes);
    emit(req, "product:updated", { productId: updated._id });
    ok(res, updated);
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
    const seller =
      req.user.role === "admin"
        ? null
        : (await store.list("sellers")).find((s) => s.userId === req.user.sub);
    ok(
      res,
      lots.filter(
        (l) =>
          ["FRESH", "SELL_SOON", "URGENT"].includes(l.freshnessState) &&
          (req.user.role === "admin" ||
            [seller?.id, req.user.sub].includes(l.sellerId)),
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
    const mandi = await fetchMandiBenchmarks(product.name);
    const demandCount = (await store.list("requirements")).filter(
      (requirement) =>
        String(requirement.product || "")
          .toLowerCase()
          .includes(product.name.toLowerCase()),
    ).length;
    const recommendation = priceRecommendation({
      baseline: latest.localReference || product.bulkPrice,
      marketBenchmark: mandi?.benchmark,
      demandCount,
    });
    ok(res, {
      product,
      history,
      summary: {
        marketplaceMedian: latest.marketplaceMedian || product.bulkPrice,
        localReference:
          mandi?.benchmark || latest.localReference || product.bulkPrice * 1.03,
        sellerAverage: latest.sellerAverage || product.bulkPrice * 0.98,
        range: [
          Number((product.bulkPrice * 0.97).toFixed(1)),
          Number((product.bulkPrice * 1.08).toFixed(1)),
        ],
        source:
          mandi?.source ||
          latest.source ||
          "KISHAN BHAIYA seeded reference provider",
        timestamp: mandi?.timestamp || latest.date || new Date().toISOString(),
        indicative: true,
        mandiRecords: mandi?.records || 0,
        recommendation,
      },
    });
  }),
);

registerUrbanStoreRoutes(router);

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
    const allSuborders = await store.list("subFulfillments", {
      orderId: order._id,
    });
    const ownedSeller = sellers.find(
      (candidate) => candidate.userId === req.user.sub,
    );
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
      : order.shipmentId
        ? [order.shipmentId]
        : [];
    const shipments = (
      await Promise.all(
        shipmentIds.map((shipmentId) => store.get("shipments", shipmentId)),
      )
    ).filter(Boolean);
    const suborders =
      order.buyerId === req.user.sub || req.user.role === "admin"
        ? allSuborders
        : sellerSuborders;
    ok(res, { ...order, shipment: shipments[0] || null, shipments, suborders });
  }),
);
router.post(
  "/orders",
  requireAuth,
  allowRoles("consumer"),
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
      const sellers = await store.list("sellers", {}, session);
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
        const seller = sellers.find((candidate) =>
          sellerKeys(candidate).includes(product.sellerId),
        );
        items.push({
          productId: product._id,
          name: product.name,
          image: product.image,
          quantity,
          price,
          unit: product.unit,
          // Stamped at order time so the line can be routed to the right
          // producer for approval even if the product is edited or delisted later.
          sellerId: product.sellerId,
          sellerName: seller?.name || "",
          approvalStatus: "PENDING",
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
          // The producer decides. Nothing ships, and no delivery is promised,
          // until every seller on the basket has accepted their own lines.
          status: "PENDING_SELLER",
          requestedAt: new Date().toISOString(),
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
        // Stock leaves `availableQuantity` immediately — that is what stops two
        // buyers claiming the same lot while a farmer is deciding. `reservedQuantity`
        // records how much of that is still provisional, so a rejection can put it
        // back and the producer can see what is awaiting their answer.
        await store.update(
          "products",
          product._id,
          {
            availableQuantity: product.availableQuantity - item.quantity,
            reservedQuantity:
              Number(product.reservedQuantity || 0) + item.quantity,
          },
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
    // Every producer with a line on this basket needs to know it is waiting.
    for (const seller of await sellersForOrder(order)) {
      if (!seller.userId) continue;
      const lines = itemsForSeller(order, seller);
      if (!lines.length) continue;
      await store.create(
        "notifications",
        {
          userId: seller.userId,
          title: "New order needs your confirmation",
          message: `${lines.map((line) => `${line.quantity}${line.unit} ${line.name}`).join(", ")} — accept or decline so the buyer knows.`,
          type: "ORDER_AWAITING_SELLER",
          entityId: order._id,
          actionPath: "/seller/orders",
          read: false,
        },
        "note",
      );
      emit(req, "notification:new", {
        type: "ORDER_AWAITING_SELLER",
        orderId: order._id,
      });
    }
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
      const seller = (await store.list("sellers")).find(
        (s) => s.userId === req.user.sub,
      );
      if (!seller || order.sellerId !== seller.id)
        throw new HttpError(
          403,
          "Only the assigned seller can report a shortage",
        );
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

/**
 * A producer's inbox. Retail orders are gated on seller approval, so this is
 * where a farmer or FPO manager actually discovers that somebody has bought from
 * them. Only the caller's own lines are returned: another seller's prices on the
 * same basket are none of their business, and neither is the basket total.
 */
router.get(
  "/seller/orders",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const seller = sellerForUser(await store.list("sellers"), req.user.sub);
    if (!seller)
      return ok(res, {
        orders: [],
        summary: { pending: 0, accepted: 0, rejected: 0 },
      });
    const [orders, users, shipments] = await Promise.all([
      store.list("orders"),
      store.list("users"),
      store.list("shipments"),
    ]);
    const rows = [];
    for (const order of orders) {
      const items = itemsForSeller(order, seller);
      if (!items.length) continue;
      const buyer = users.find((candidate) => candidate._id === order.buyerId);
      const shipment = shipments.find((candidate) =>
        shipmentBelongsToOrders(candidate, new Set([order._id])),
      );
      const pending = items.filter(
        (item) => (item.approvalStatus || "PENDING") === "PENDING",
      );
      rows.push({
        orderId: order._id,
        orderStatus: order.status,
        type: order.type,
        placedAt: order.createdAt || order.requestedAt,
        // A decision is only open while the order itself is still waiting; once
        // it has settled or moved on, these lines are history.
        awaitingDecision:
          Boolean(pending.length) && order.status === "PENDING_SELLER",
        decision: pending.length
          ? "PENDING"
          : items.every((item) => item.approvalStatus === "ACCEPTED")
            ? "ACCEPTED"
            : items.every((item) => item.approvalStatus === "REJECTED")
              ? "REJECTED"
              : "PARTIAL",
        items,
        itemCount: items.length,
        quantity: sum(items, (item) => item.quantity),
        subtotal: sum(items, (item) => item.price * item.quantity),
        buyerName: buyer?.name || "Buyer",
        deliveryAddress: order.deliveryAddress || "",
        deliverySlot: order.deliverySlot || "",
        rejectionReason:
          items.find((item) => item.rejectionReason)?.rejectionReason || "",
        shipmentStatus: shipment?.status || null,
        nextStop: shipment?.nextStop?.label || null,
        estimatedArrival: shipment?.estimatedArrival || null,
      });
    }
    // Decisions the farmer still owes someone come first, newest within that.
    rows.sort((a, b) => {
      if (a.awaitingDecision !== b.awaitingDecision)
        return a.awaitingDecision ? -1 : 1;
      return new Date(b.placedAt || 0) - new Date(a.placedAt || 0);
    });
    ok(res, {
      orders: rows,
      summary: {
        pending: rows.filter((row) => row.awaitingDecision).length,
        accepted: rows.filter((row) => row.decision === "ACCEPTED").length,
        rejected: rows.filter((row) => row.decision === "REJECTED").length,
      },
    });
  }),
);

/**
 * The confirm-or-decline action itself. A seller answers only for their own
 * lines; the order settles once nobody is left to answer. Declining releases the
 * stock that was held for those lines so it can be sold to somebody else.
 */
router.post(
  "/orders/:id/seller-response",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  validate(sellerResponseSchema),
  asyncHandler(async (req, res) => {
    const seller = sellerForUser(await store.list("sellers"), req.user.sub);
    if (!seller)
      throw new HttpError(
        403,
        "This account is not linked to a producer profile",
      );
    const order = await store.get("orders", req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    const mine = itemsForSeller(order, seller);
    if (!mine.length)
      throw new HttpError(403, "This order has no lines from your farm");
    if (order.status !== "PENDING_SELLER")
      throw new HttpError(
        409,
        `This order is already ${String(order.status).replaceAll("_", " ").toLowerCase()}`,
      );
    const open = mine.filter(
      (item) => (item.approvalStatus || "PENDING") === "PENDING",
    );
    if (!open.length)
      throw new HttpError(409, "You have already answered for these lines");

    const accepted = req.body.action === "ACCEPT";
    const keys = sellerKeys(seller);
    const decidedAt = new Date().toISOString();
    const items = (order.items || []).map((item) =>
      keys.includes(item.sellerId) &&
      (item.approvalStatus || "PENDING") === "PENDING"
        ? {
            ...item,
            approvalStatus: accepted ? "ACCEPTED" : "REJECTED",
            decidedAt,
            ...(accepted ? {} : { rejectionReason: req.body.reason || "" }),
          }
        : item,
    );
    const settlement = settleOrderApproval({ ...order, items });

    // Release the held stock for anything declined. Accepted lines keep the
    // deduction made at checkout; they just stop being provisional.
    for (const item of open) {
      const product = await store.get("products", item.productId);
      if (!product) continue;
      await store.update("products", item.productId, {
        reservedQuantity: Math.max(
          0,
          Number(product.reservedQuantity || 0) - item.quantity,
        ),
        ...(accepted
          ? {}
          : {
              availableQuantity:
                Number(product.availableQuantity || 0) + item.quantity,
            }),
      });
    }

    // Built key by key: an `undefined` in a mongo `$set` is treated
    // inconsistently, so only the fields that actually changed are sent.
    const patch = { items, status: settlement.status };
    if (settlement.settled) {
      patch.subtotal = settlement.subtotal;
      patch.deliveryFee = settlement.deliveryFee;
      patch.total = settlement.total;
      if (settlement.status === "CONFIRMED") patch.confirmedAt = decidedAt;
      else patch.cancelledAt = decidedAt;
    }
    const updated = await store.update("orders", order._id, patch);

    const names = open.map((item) => item.name).join(", ");
    await store.create(
      "notifications",
      {
        userId: order.buyerId,
        title: accepted
          ? "Your order was confirmed"
          : "Part of your order was declined",
        message: accepted
          ? `${seller.name} confirmed ${names}.`
          : `${seller.name} cannot supply ${names}${req.body.reason ? `: ${req.body.reason}` : ""}. You have not been charged for it.`,
        type: accepted ? "ORDER_SELLER_ACCEPTED" : "ORDER_SELLER_REJECTED",
        entityId: order._id,
        actionPath: `/orders/${order._id}`,
        read: false,
      },
      "note",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: accepted ? "ORDER_SELLER_ACCEPTED" : "ORDER_SELLER_REJECTED",
        entityType: "Order",
        entityId: order._id,
        metadata: {
          sellerId: seller._id || seller.id,
          lines: open.length,
          reason: req.body.reason || "",
          orderStatus: settlement.status,
        },
      },
      "audit",
    );
    emit(req, "order:statusChanged", updated);
    emit(req, "notification:new", {
      type: accepted ? "ORDER_SELLER_ACCEPTED" : "ORDER_SELLER_REJECTED",
      orderId: order._id,
    });
    ok(res, {
      orderId: order._id,
      decision: accepted ? "ACCEPTED" : "REJECTED",
      lines: open.length,
      orderStatus: settlement.status,
      settled: settlement.settled,
    });
  }),
);

/**
 * Tells the buyer's review screen what it is allowed to ask for, so the UI never
 * renders a form the POST below would reject. `reviewable` stays false until the
 * order is DELIVERED — that is the whole point of the delivery gate.
 */
router.get(
  "/orders/:id/review-eligibility",
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await store.get("orders", req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    if (order.buyerId !== req.user.sub && req.user.role !== "admin")
      throw new HttpError(403, "Only the buyer of this order can review it");
    const existing = await store.list("reviews", { orderId: order._id });
    const sellers = await sellersForOrder(order);
    ok(res, {
      orderId: order._id,
      status: order.status,
      delivered: order.status === "DELIVERED",
      reviewable: order.status === "DELIVERED" && !existing.length,
      alreadyReviewed: existing.length > 0,
      submittedAt: existing[0]?.createdAt || null,
      sellers: sellers.map((seller) => ({
        sellerId: seller._id || seller.id,
        name: seller.name,
        type: seller.type,
        location: seller.location,
        image: seller.image,
      })),
      items: (order.items || []).map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });
  }),
);

router.post(
  "/orders/:id/reviews",
  requireAuth,
  allowRoles("consumer", "business_buyer"),
  validate(orderReviewSchema),
  asyncHandler(async (req, res) => {
    const order = await store.get("orders", req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    if (order.buyerId !== req.user.sub)
      throw new HttpError(403, "Only the buyer of this order can review it");
    if (order.status !== "DELIVERED")
      throw new HttpError(
        409,
        "You can rate this order once it has been delivered",
      );
    if ((await store.list("reviews", { orderId: order._id })).length)
      throw new HttpError(409, "You have already reviewed this order");

    const sellers = await sellersForOrder(order);
    if (!sellers.length)
      throw new HttpError(409, "This order has no seller to review");
    const orderedProductIds = new Set(
      (order.items || []).map((item) => item.productId),
    );
    const productRatings = (req.body.productRatings || []).filter((entry) =>
      orderedProductIds.has(entry.productId),
    );

    const created = [];
    for (const seller of sellers) {
      created.push(
        await store.create(
          "reviews",
          {
            orderId: order._id,
            buyerId: req.user.sub,
            sellerId: seller._id || seller.id,
            productId: "",
            rating: req.body.rating,
            comment: req.body.comment,
            tags: req.body.tags,
            authorName: req.user.name,
            verifiedPurchase: true,
          },
          "review",
        ),
      );
    }
    const products = await store.list("products");
    for (const entry of productRatings) {
      const product = products.find(
        (candidate) => candidate._id === entry.productId,
      );
      created.push(
        await store.create(
          "reviews",
          {
            orderId: order._id,
            buyerId: req.user.sub,
            sellerId: product?.sellerId || sellers[0]._id || sellers[0].id,
            productId: entry.productId,
            rating: entry.rating,
            comment: entry.comment,
            tags: [],
            authorName: req.user.name,
            verifiedPurchase: true,
          },
          "review",
        ),
      );
    }

    // Product aggregates first: the seller roll-up rewrites the denormalised
    // `products[].seller` snapshot and would otherwise be clobbered.
    for (const entry of productRatings)
      await recomputeProductRating(entry.productId);
    for (const seller of sellers)
      await recomputeSellerRating(seller._id || seller.id);

    await Promise.all([
      ...sellers
        .filter((seller) => seller.userId)
        .map((seller) =>
          store.create(
            "notifications",
            {
              userId: seller.userId,
              title: `New ${req.body.rating}★ review`,
              message: req.body.comment
                ? `${req.user.name}: “${req.body.comment.slice(0, 120)}”`
                : `${req.user.name} rated your produce ${req.body.rating} out of 5.`,
              type: "REVIEW_RECEIVED",
              entityId: order._id,
              read: false,
            },
            "note",
          ),
        ),
      store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "ORDER_REVIEWED",
          entityType: "Order",
          entityId: order._id,
          metadata: {
            rating: req.body.rating,
            products: productRatings.length,
          },
        },
        "audit",
      ),
    ]);
    emit(req, "review:created", {
      orderId: order._id,
      rating: req.body.rating,
    });
    ok(res, { orderId: order._id, reviews: created });
  }),
);

router.get(
  "/products/:id/reviews",
  asyncHandler(async (req, res) => {
    const reviews = await store.list("reviews", { productId: req.params.id });
    const sorted = [...reviews].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    const product = await store.get("products", req.params.id);
    ok(res, {
      reviews: sorted,
      summary: {
        count: sorted.length,
        average: averageRating(sorted),
        displayed: {
          rating: product?.rating ?? 0,
          reviews: product?.reviews ?? 0,
        },
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: sorted.filter((review) => Number(review.rating) === star)
            .length,
        })),
      },
    });
  }),
);

router.get(
  "/sellers/:id/reviews",
  asyncHandler(async (req, res) => {
    const sellers = await store.list("sellers");
    const seller = sellers.find((candidate) =>
      sellerKeys(candidate).includes(req.params.id),
    );
    if (!seller) throw new HttpError(404, "Seller not found");
    const keys = sellerKeys(seller);
    const reviews = (await store.list("reviews", {}))
      .filter((review) => keys.includes(review.sellerId) && !review.productId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    ok(res, {
      reviews,
      summary: {
        count: reviews.length,
        average: averageRating(reviews),
        displayed: { rating: seller.rating ?? 0, reviews: seller.reviews ?? 0 },
      },
    });
  }),
);

/**
 * Feedback about the marketplace itself, collected right after checkout while
 * the experience is still fresh. Deliberately not tied to a delivered order.
 */
router.post(
  "/platform-feedback",
  requireAuth,
  validate(platformFeedbackSchema),
  asyncHandler(async (req, res) => {
    const created = await store.create(
      "platformFeedback",
      {
        userId: req.user.sub,
        role: req.user.role,
        orderId: req.body.orderId,
        rating: req.body.rating,
        comment: req.body.comment,
        tags: req.body.tags,
      },
      "pfb",
    );
    await store.create(
      "auditLogs",
      {
        actorId: req.user.sub,
        action: "PLATFORM_FEEDBACK_SUBMITTED",
        entityType: "PlatformFeedback",
        entityId: created._id,
        metadata: { rating: req.body.rating },
      },
      "audit",
    );
    ok(res, created);
  }),
);

router.get(
  "/platform-feedback",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (_req, res) => {
    const rows = (await store.list("platformFeedback", {})).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    ok(res, {
      feedback: rows,
      summary: {
        count: rows.length,
        average: averageRating(rows),
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: rows.filter((row) => Number(row.rating) === star).length,
        })),
      },
    });
  }),
);

registerBulkProcurementRoutes(router);

router.get(
  "/expected-harvests",
  requireAuth,
  allowRoles("farmer", "fpo_manager", "admin"),
  asyncHandler(async (req, res) => {
    const harvests = await store.list("expectedHarvests");
    if (req.user.role === "admin") return ok(res, harvests);
    const seller = (await store.list("sellers")).find(
      (s) => s.userId === req.user.sub,
    );
    ok(
      res,
      harvests.filter((h) => [seller?.id, req.user.sub].includes(h.sellerId)),
    );
  }),
);
router.post(
  "/expected-harvests",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  validate(harvestSchema),
  asyncHandler(async (req, res) => {
    const seller = (await store.list("sellers")).find(
      (s) => s.userId === req.user.sub,
    );
    ok(
      res,
      await store.create(
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
      ),
    );
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
      const seller = (await store.list("sellers")).find(
        (s) => s.userId === req.user.sub,
      );
      if (![seller?.id, req.user.sub].includes(harvest.sellerId))
        throw new HttpError(
          403,
          "Only the harvest owner can convert this record",
        );
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
      const seller = (await store.list("sellers")).find(
        (s) => s.userId === req.user.sub,
      );
      if (![seller?.id, req.user.sub].includes(lot.sellerId))
        throw new HttpError(
          403,
          "Only the lot owner can create a rescue offer",
        );
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

registerRecurringProcurementRoutes(router);
router.get(
  "/fpo/members",
  requireAuth,
  allowRoles("fpo_manager"),
  asyncHandler(async (req, res) => {
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    ok(
      res,
      managedFpo ? await store.list("members", { fpoId: managedFpo.id }) : [],
    );
  }),
);
router.get(
  "/fpos",
  requireAuth,
  allowRoles("farmer"),
  asyncHandler(async (req, res) => {
    const latitudeProvided = req.query.latitude !== undefined;
    const longitudeProvided = req.query.longitude !== undefined;
    if (latitudeProvided !== longitudeProvided)
      throw new HttpError(400, "Latitude and longitude must be provided together");

    let originCoordinates = null;
    let originLabel = null;
    let originSource = null;
    if (latitudeProvided) {
      const latitude = Number(req.query.latitude);
      const longitude = Number(req.query.longitude);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < 6 ||
        latitude > 37.7 ||
        longitude < 68 ||
        longitude > 97.5
      )
        throw new HttpError(400, "Choose a valid location inside India");
      originCoordinates = [longitude, latitude];
      originLabel = "Current device location";
      originSource = "DEVICE";
    }

    const [sellers, users] = await Promise.all([
      store.list("sellers"),
      store.list("users"),
    ]);
    if (!originCoordinates) {
      const farmer = users.find((user) => user._id === req.user.sub);
      const farmProfile = sellerForUser(sellers, req.user.sub);
      originCoordinates =
        farmer?.locationCoordinates || farmProfile?.coordinates || null;
      originLabel = farmProfile?.location || farmer?.location || null;
      originSource = originCoordinates ? "SAVED_FARM" : null;
    }

    const usersById = new Map(users.map((user) => [user._id, user]));
    const fpos = sellers
      .filter((seller) => {
        const manager = usersById.get(seller.userId);
        return (
          seller.type === "FPO" &&
          manager?.role === "fpo_manager" &&
          accountStatusOf(manager) === "ACTIVE"
        );
      })
      .map((seller) => {
        const manager = usersById.get(seller.userId);
        const managerIsActive =
          manager?.role === "fpo_manager" && accountStatusOf(manager) === "ACTIVE";
        const distance =
          originCoordinates && Array.isArray(seller.coordinates)
            ? Number(distanceKm(originCoordinates, seller.coordinates).toFixed(1))
            : null;
        return {
          fpoId: seller.id || seller._id,
          name: seller.name,
          location: seller.location,
          address: seller.address || seller.location,
          coordinates: seller.coordinates,
          contactName: seller.contactName || "FPO office",
          phone: seller.contactPhone || null,
          email: seller.contactEmail || null,
          officeHours: seller.officeHours || "Contact the FPO office for timings",
          memberCount: seller.memberCount || null,
          crops: seller.crops || [],
          rating: seller.rating,
          reviews: seller.reviews,
          reliability: seller.reliability,
          completedOrders: seller.completedOrders,
          image: seller.image,
          acceptingMembers: Boolean(seller.userId && managerIsActive),
          distanceKm: distance,
        };
      })
      .sort((first, second) => {
        if (first.distanceKm === null && second.distanceKm === null)
          return first.name.localeCompare(second.name);
        if (first.distanceKm === null) return 1;
        if (second.distanceKm === null) return -1;
        return first.distanceKm - second.distanceKm;
      });
    ok(res, fpos, {
      origin: {
        label: originLabel,
        source: originSource,
        coordinates: originCoordinates,
      },
    });
  }),
);
router.get(
  "/fpo/membership-requests",
  requireAuth,
  allowRoles("farmer", "fpo_manager"),
  asyncHandler(async (req, res) => {
    const requests = await store.list("fpoMembershipRequests");
    if (req.user.role === "farmer")
      return ok(
        res,
        requests.filter((request) => request.farmerId === req.user.sub),
      );
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    ok(
      res,
      managedFpo
        ? requests.filter((request) => request.fpoId === managedFpo.id)
        : [],
    );
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
      (seller) =>
        seller.id === req.body.fpoId && seller.type === "FPO" && seller.userId,
    );
    if (!fpo)
      throw new HttpError(
        404,
        "This FPO is not available for membership requests",
      );
    const requests = await store.list("fpoMembershipRequests");
    const existing = requests.find(
      (request) =>
        request.farmerId === req.user.sub &&
        request.fpoId === fpo.id &&
        ["PENDING", "APPROVED"].includes(request.status),
    );
    if (existing)
      throw new HttpError(
        409,
        existing.status === "APPROVED"
          ? "You are already a member of this FPO"
          : "A membership request is already pending",
      );
    const request = await store.create(
      "fpoMembershipRequests",
      {
        fpoId: fpo.id,
        fpoName: fpo.name,
        farmerId: req.user.sub,
        farmerName: farmer?.name || req.user.name,
        farmName:
          farmer?.organization || `${farmer?.name || req.user.name}'s farm`,
        location: farmer?.location || "Not provided",
        message: req.body.message,
        status: "PENDING",
      },
      "membership",
    );
    await Promise.all([
      store.create(
        "notifications",
        {
          userId: fpo.userId,
          title: "New FPO membership request",
          message: `${request.farmerName} requested to join ${fpo.name}.`,
          type: "FPO_MEMBERSHIP_REQUEST",
          entityId: request._id,
          read: false,
        },
        "note",
      ),
      store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "FPO_MEMBERSHIP_REQUESTED",
          entityType: "FPOMembershipRequest",
          entityId: request._id,
          metadata: { fpoId: fpo.id },
        },
        "audit",
      ),
    ]);
    emit(req, "notification:new", {
      userId: fpo.userId,
      type: "FPO_MEMBERSHIP_REQUEST",
      request,
    });
    ok(res, request);
  }),
);
router.patch(
  "/fpo/membership-requests/:id",
  requireAuth,
  allowRoles("fpo_manager"),
  validate(membershipReviewSchema),
  asyncHandler(async (req, res) => {
    const membershipRequest = await store.get(
      "fpoMembershipRequests",
      req.params.id,
    );
    if (!membershipRequest)
      throw new HttpError(404, "Membership request not found");
    const managedFpo = (await store.list("sellers")).find(
      (seller) => seller.type === "FPO" && seller.userId === req.user.sub,
    );
    if (!managedFpo || membershipRequest.fpoId !== managedFpo.id)
      throw new HttpError(403, "You can review requests only for your FPO");
    if (membershipRequest.status !== "PENDING")
      throw new HttpError(
        409,
        "This membership request has already been reviewed",
      );
    const status = req.body.action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await store.update(
      "fpoMembershipRequests",
      membershipRequest._id,
      {
        status,
        managerNote: req.body.note,
        reviewedBy: req.user.sub,
        reviewedAt: new Date().toISOString(),
      },
    );
    if (status === "APPROVED") {
      const existingMember = (await store.list("members")).find(
        (member) =>
          member.fpoId === managedFpo.id &&
          member.userId === membershipRequest.farmerId,
      );
      if (!existingMember)
        await store.create(
          "members",
          {
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
          },
          "member",
        );
    }
    await Promise.all([
      store.create(
        "notifications",
        {
          userId: membershipRequest.farmerId,
          title: `FPO membership ${status.toLowerCase()}`,
          message:
            status === "APPROVED"
              ? `${managedFpo.name} approved your membership request.`
              : `${managedFpo.name} did not approve your membership request.`,
          type: "FPO_MEMBERSHIP_UPDATED",
          entityId: membershipRequest._id,
          read: false,
        },
        "note",
      ),
      store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: `FPO_MEMBERSHIP_${status}`,
          entityType: "FPOMembershipRequest",
          entityId: membershipRequest._id,
          metadata: {
            farmerId: membershipRequest.farmerId,
            fpoId: managedFpo.id,
          },
        },
        "audit",
      ),
    ]);
    emit(req, "notification:new", {
      userId: membershipRequest.farmerId,
      type: "FPO_MEMBERSHIP_UPDATED",
      request: updated,
    });
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
    ok(
      res,
      managedFpo
        ? await store.list("settlements", { fpoId: managedFpo.id })
        : [],
    );
  }),
);

registerLogisticsRoutes(router);

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
      .filter(
        (profile) =>
          !requestedStatus || profile.overallStatus === requestedStatus,
      )
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
      .sort(
        (a, b) =>
          new Date(b.submittedAt || b.updatedAt) -
          new Date(a.submittedAt || a.updatedAt),
      );
    ok(res, queue);
  }),
);
router.get(
  "/admin/verifications/:id",
  requireAuth,
  allowRoles("admin"),
  asyncHandler(async (req, res) => {
    const profile = await store.get("verificationProfiles", req.params.id);
    if (!profile)
      throw new HttpError(404, "Verification application not found");
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
    if (!profile)
      throw new HttpError(404, "Verification application not found");
    const applicant = await store.get("users", profile.userId);
    if (!applicant) throw new HttpError(404, "Applicant account not found");
    const transitions = {
      APPROVE: {
        accountStatus: "ACTIVE",
        verificationStatus: "APPROVED",
        verified: true,
        overallStatus: "APPROVED",
      },
      REQUEST_CHANGES: {
        accountStatus: "CHANGES_REQUESTED",
        verificationStatus: "CHANGES_REQUESTED",
        verified: false,
        overallStatus: "CHANGES_REQUESTED",
      },
      REJECT: {
        accountStatus: "REJECTED",
        verificationStatus: "REJECTED",
        verified: false,
        overallStatus: "REJECTED",
      },
      SUSPEND: {
        accountStatus: "SUSPENDED",
        verificationStatus: "SUSPENDED",
        verified: false,
        overallStatus: "SUSPENDED",
      },
      REACTIVATE: {
        accountStatus: "ACTIVE",
        verificationStatus: "APPROVED",
        verified: true,
        overallStatus: "APPROVED",
      },
    };
    const transition = transitions[req.body.action];
    const now = new Date().toISOString();
    const updatedUser = await store.update("users", applicant._id, {
      accountStatus: transition.accountStatus,
      verificationStatus: transition.verificationStatus,
      verified: transition.verified,
    });
    const updatedProfile = await store.update(
      "verificationProfiles",
      profile._id,
      {
        overallStatus: transition.overallStatus,
        approvedAt:
          transition.overallStatus === "APPROVED" ? now : profile.approvedAt,
        approvedBy:
          transition.overallStatus === "APPROVED"
            ? req.user.sub
            : profile.approvedBy,
        rejectionReasonCode: req.body.reasonCode || "",
        adminNote: req.body.note || "",
      },
    );
    const review = await store.create(
      "verificationReviews",
      {
        profileId: profile._id,
        applicantId: applicant._id,
        reviewerId: req.user.sub,
        action: req.body.action,
        reasonCode: req.body.reasonCode,
        note: req.body.note,
        previousStatus: profile.overallStatus,
        nextStatus: transition.overallStatus,
      },
      "review",
    );
    await store.create(
      "auditLogs",
      {
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
      },
      "audit",
    );
    await store.create(
      "notifications",
      {
        userId: applicant._id,
        title: "Verification status updated",
        message:
          req.body.note ||
          `Your application is now ${transition.overallStatus.replaceAll("_", " ").toLowerCase()}.`,
        type: "VERIFICATION",
        entityId: profile._id,
        read: false,
      },
      "notification",
    );
    emit(req, "verification:updated", {
      userId: applicant._id,
      status: transition.accountStatus,
    });
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
    const [
      allOrders,
      allLots,
      allHarvests,
      allShipments,
      sellers,
      subFulfillments,
    ] = await Promise.all(
      [
        "orders",
        "lots",
        "expectedHarvests",
        "shipments",
        "sellers",
        "subFulfillments",
      ].map((key) => store.list(key)),
    );
    const seller = sellerForUser(sellers, req.user.sub);
    const sellerSuborders =
      req.user.role === "admin" || !seller
        ? []
        : subFulfillments.filter((suborder) => suborder.sellerId === seller.id);
    const scopedOrderIds =
      req.user.role === "admin"
        ? new Set(allOrders.map((order) => order._id))
        : new Set([
            ...allOrders
              .filter((order) => order.sellerId === seller?.id)
              .map((order) => order._id),
            ...sellerSuborders.map((suborder) => suborder.orderId),
          ]);
    const orders = allOrders.filter((order) => scopedOrderIds.has(order._id));
    const lots =
      req.user.role === "admin"
        ? allLots
        : allLots.filter((lot) => lot.sellerId === seller?.id);
    const harvests =
      req.user.role === "admin"
        ? allHarvests
        : allHarvests.filter((harvest) =>
            [seller?.id, req.user.sub].includes(harvest.sellerId),
          );
    const shipments = allShipments.filter((shipment) =>
      shipmentBelongsToOrders(shipment, scopedOrderIds),
    );
    const revenue =
      req.user.role === "admin"
        ? orders.reduce((total, order) => total + (order.total || 0), 0)
        : sellerSuborders.length
          ? sellerSuborders.reduce(
              (total, suborder) => total + (suborder.subtotal || 0),
              0,
            )
          : orders.reduce((total, order) => total + (order.total || 0), 0);
    const monthly = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (5 - index), 1);
      const matching = orders.filter((order) => {
        const created = new Date(order.createdAt || 0);
        return (
          created.getFullYear() === month.getFullYear() &&
          created.getMonth() === month.getMonth()
        );
      });
      const orderRevenue =
        req.user.role !== "admin" && sellerSuborders.length
          ? sellerSuborders
              .filter((suborder) =>
                matching.some((order) => order._id === suborder.orderId),
              )
              .reduce((total, suborder) => total + (suborder.subtotal || 0), 0)
          : matching.reduce((total, order) => total + (order.total || 0), 0);
      return {
        month: month.toLocaleString("en", { month: "short" }),
        revenue: orderRevenue,
        retail: matching.filter((order) => order.type !== "BULK").length,
        bulk: matching.filter((order) => order.type === "BULK").length,
      };
    });
    ok(res, {
      revenue,
      orders: orders.length,
      inventory: lots.reduce((n, l) => n + (l.availableQuantity || 0), 0),
      reservedBeforeHarvest: harvests.reduce(
        (n, h) => n + (h.reservedQuantity || 0),
        0,
      ),
      surplusRescued: lots
        .filter((lot) => lot.freshnessState === "SELL_SOON")
        .reduce((total, lot) => total + (lot.availableQuantity || 0), 0),
      expiredQuantity: lots
        .filter((lot) => lot.freshnessState === "EXPIRED")
        .reduce((total, lot) => total + (lot.availableQuantity || 0), 0),
      referenceDelta: 0,
      onTimeFulfillment: shipments.length
        ? Math.round(
            (shipments.filter((shipment) => shipment.status !== "DELAYED")
              .length /
              shipments.length) *
              100,
          )
        : 0,
      vehicleUtilization: shipments.length
        ? Math.round(
            shipments.reduce(
              (total, shipment) => total + (shipment.utilization || 0),
              0,
            ) / shipments.length,
          )
        : 0,
      monthly,
    });
  }),
);

export default router;
