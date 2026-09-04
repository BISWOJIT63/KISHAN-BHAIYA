import { store } from "./dataStore.js";
import { HttpError } from "../utils/http.js";

const dayIndex = new Map(
  [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].map((day, index) => [day.toLowerCase(), index]),
);

const asDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const atStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(9, 0, 0, 0);
  return date;
};

const alignToPreferredDay = (date, weekdays, maximumDays = 7) => {
  const preferred = new Set(
    (weekdays || [])
      .map((day) => dayIndex.get(String(day).toLowerCase()))
      .filter((day) => day !== undefined),
  );
  if (!preferred.size) return date;
  for (let offset = 0; offset <= maximumDays; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(candidate.getDate() + offset);
    if (preferred.has(candidate.getDay())) return candidate;
  }
  return date;
};

/** Calculates the next generation date while respecting the plan cadence. */
export function nextRecurringRun(plan, from = new Date(), initial = false) {
  const now = atStartOfDay(from);
  const requestedStart = asDate(plan.startDate);
  if (initial && requestedStart && requestedStart > now) {
    return atStartOfDay(requestedStart).toISOString();
  }

  if (plan.frequency === "WEEKLY") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return alignToPreferredDay(tomorrow, plan.weekdays, 7).toISOString();
  }

  const candidate = new Date(now);
  if (plan.frequency === "BIWEEKLY")
    candidate.setDate(candidate.getDate() + 14);
  else candidate.setMonth(candidate.getMonth() + 1);
  return alignToPreferredDay(candidate, plan.weekdays, 7).toISOString();
}

/** Creates one normal bulk requirement from an active recurring plan. */
export async function generateRecurringRequirement(
  planId,
  { trigger = "MANUAL", now = new Date() } = {},
) {
  return store.transaction(async (session) => {
    const plan = await store.get("recurring", planId, session);
    if (!plan) throw new HttpError(404, "Recurring plan not found");
    if (plan.status !== "ACTIVE") {
      throw new HttpError(409, "Resume this recurring plan before running it");
    }

    const plannedRun = plan.nextRun || now.toISOString();
    if (trigger === "AUTOMATIC" && plan.lastGeneratedFor === plannedRun) {
      return { plan, requirement: null, skipped: true };
    }

    const buyer = await store.get("users", plan.buyerId, session);
    const requiredDate = new Date(now);
    requiredDate.setDate(
      requiredDate.getDate() + Number(plan.leadTimeDays || 5),
    );
    const targetPrice = Array.isArray(plan.priceBand)
      ? Number(
          ((Number(plan.priceBand[0]) + Number(plan.priceBand[1])) / 2).toFixed(
            2,
          ),
        )
      : undefined;
    const requirement = await store.create(
      "requirements",
      {
        buyerId: plan.buyerId,
        buyer: buyer?.organization || buyer?.name || "Business buyer",
        product: plan.product,
        productId: plan.productId || undefined,
        category: plan.category,
        quantity: plan.quantity,
        unit: plan.unit,
        quality: plan.grade,
        targetPrice,
        requiredDate: requiredDate.toISOString(),
        location: plan.location,
        coordinates: plan.coordinates,
        allowPartial: plan.allowPartial,
        minFillPercent: plan.minFillPercent,
        packaging: plan.packaging,
        transport: plan.transport,
        notes: plan.notes,
        recurring: true,
        frequency: plan.frequency,
        recurringPlanId: plan._id,
        generationTrigger: trigger,
        status: "OPEN",
        quotationsCount: 0,
        createdAt: now.toISOString(),
      },
      "req-recurring",
      session,
    );
    const updatedPlan = await store.update(
      "recurring",
      plan._id,
      {
        lastRun: now.toISOString(),
        lastGeneratedFor: plannedRun,
        lastRequirementId: requirement._id,
        generatedCount: Number(plan.generatedCount || 0) + 1,
        nextRun: nextRecurringRun(plan, now),
        updatedAt: now.toISOString(),
      },
      session,
    );
    await store.create(
      "notifications",
      {
        userId: plan.buyerId,
        title: "Recurring requirement created",
        message: `${plan.product}: ${plan.quantity}${plan.unit} is now open for supplier quotations.`,
        type: "RECURRING_REQUIREMENT_CREATED",
        entityId: requirement._id,
        actionPath: `/bulk/${requirement._id}`,
        read: false,
      },
      "note",
      session,
    );
    return { plan: updatedPlan, requirement, skipped: false };
  });
}

export async function processDueRecurringRequirements(now = new Date()) {
  const plans = (await store.list("recurring", { status: "ACTIVE" })).filter(
    (plan) => asDate(plan.nextRun)?.getTime() <= now.getTime(),
  );
  const results = [];
  for (const plan of plans) {
    try {
      results.push(
        await generateRecurringRequirement(plan._id, {
          trigger: "AUTOMATIC",
          now,
        }),
      );
    } catch (error) {
      results.push({ planId: plan._id, error: error.message });
    }
  }
  return {
    due: plans.length,
    generated: results.filter((result) => result.requirement).length,
    failed: results.filter((result) => result.error).length,
  };
}
