import { z } from "zod";
import { store } from "../services/dataStore.js";
import {
  generateRecurringRequirement,
  nextRecurringRun,
  processDueRecurringRequirements,
} from "../services/recurringProcurement.js";
import { allowRoles, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, HttpError, ok } from "../utils/http.js";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const priceBandSchema = z
  .tuple([z.coerce.number().positive(), z.coerce.number().positive()])
  .refine(([minimum, maximum]) => minimum <= maximum, {
    message: "Minimum price cannot exceed maximum price",
  });

const recurringPlanSchema = z.object({
  product: z.string().trim().min(2).max(100),
  productId: z.string().trim().optional(),
  category: z.string().trim().min(2).max(60),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(20).default("kg"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  weekdays: z.array(z.enum(weekdays)).min(1).max(7),
  grade: z.string().trim().min(1).max(40),
  priceBand: priceBandSchema.nullable().optional(),
  location: z.string().trim().min(2).max(160),
  coordinates: z
    .tuple([z.number().min(68).max(97.5), z.number().min(6).max(37.7)])
    .optional(),
  packaging: z.string().trim().max(120).optional().default("Buyer standard"),
  transport: z.string().trim().max(80).optional().default("Either"),
  allowPartial: z.boolean().default(true),
  minFillPercent: z.coerce.number().min(1).max(100).default(80),
  leadTimeDays: z.coerce.number().int().min(1).max(30).default(5),
  startDate: z.string().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});

const recurringUpdateSchema = recurringPlanSchema.partial().extend({
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

const assertOwner = (plan, user) => {
  if (user.role !== "admin" && plan.buyerId !== user.sub) {
    throw new HttpError(
      403,
      "Only the recurring requirement owner can change it",
    );
  }
};

const emit = (req, event, payload) => req.app.get("io")?.emit(event, payload);

export function registerRecurringProcurementRoutes(router) {
  router.get(
    "/recurring-requirements",
    requireAuth,
    allowRoles("business_buyer", "admin"),
    asyncHandler(async (req, res) => {
      const plans = await store.list(
        "recurring",
        req.user.role === "admin" ? {} : { buyerId: req.user.sub },
      );
      ok(
        res,
        plans.sort(
          (left, right) =>
            new Date(left.nextRun || 0) - new Date(right.nextRun || 0),
        ),
      );
    }),
  );

  router.post(
    "/recurring-requirements",
    requireAuth,
    allowRoles("business_buyer"),
    validate(recurringPlanSchema),
    asyncHandler(async (req, res) => {
      const user = await store.get("users", req.user.sub);
      const plan = await store.create(
        "recurring",
        {
          ...req.body,
          buyerId: req.user.sub,
          buyer: user?.organization || user?.name,
          status: "ACTIVE",
          generatedCount: 0,
          nextRun: nextRecurringRun(req.body, new Date(), true),
        },
        "recurring",
      );
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "RECURRING_PLAN_CREATED",
          entityType: "RecurringRequirement",
          entityId: plan._id,
        },
        "audit",
      );
      res.status(201);
      ok(res, plan);
    }),
  );

  router.patch(
    "/recurring-requirements/:id",
    requireAuth,
    allowRoles("business_buyer"),
    validate(recurringUpdateSchema),
    asyncHandler(async (req, res) => {
      const plan = await store.get("recurring", req.params.id);
      if (!plan) throw new HttpError(404, "Recurring requirement not found");
      assertOwner(plan, req.user);
      const changes = { ...req.body };
      if (changes.status === "ACTIVE" && plan.status !== "ACTIVE") {
        changes.nextRun = nextRecurringRun(
          { ...plan, ...changes },
          new Date(),
          true,
        );
      }
      const updated = await store.update("recurring", plan._id, changes);
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "RECURRING_PLAN_UPDATED",
          entityType: "RecurringRequirement",
          entityId: plan._id,
          metadata: changes,
        },
        "audit",
      );
      ok(res, updated);
    }),
  );

  router.post(
    "/recurring-requirements/:id/run",
    requireAuth,
    allowRoles("business_buyer"),
    asyncHandler(async (req, res) => {
      const plan = await store.get("recurring", req.params.id);
      if (!plan) throw new HttpError(404, "Recurring requirement not found");
      assertOwner(plan, req.user);
      const result = await generateRecurringRequirement(plan._id, {
        trigger: "MANUAL",
      });
      await store.create(
        "auditLogs",
        {
          actorId: req.user.sub,
          action: "RECURRING_PLAN_RUN",
          entityType: "RecurringRequirement",
          entityId: plan._id,
          metadata: { requirementId: result.requirement?._id },
        },
        "audit",
      );
      emit(req, "requirement:created", result.requirement);
      emit(req, "notification:new", {
        type: "RECURRING_REQUIREMENT_CREATED",
        requirementId: result.requirement?._id,
      });
      ok(res, result);
    }),
  );

  router.get(
    "/jobs/recurring",
    asyncHandler(async (_req, res) =>
      ok(res, await processDueRecurringRequirements()),
    ),
  );
}
