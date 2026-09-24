import { z } from "zod";
import { env } from "../config/env.js";

const DAY_MS = 86_400_000;
const CACHE_TTL_MS = 15 * 60 * 1000;

const forecastSchema = z.object({
  crops: z.array(z.object({
    productId: z.string().min(1),
    projectedPrice: z.number().positive(),
    projectedDemand: z.number().nonnegative(),
    riskLevel: z.enum(["HIGH_DEFICIT", "DEFICIT", "BALANCED", "SURPLUS"]),
    recommendation: z.string().min(10).max(320),
    confidence: z.number().int().min(0).max(100),
    evidence: z.array(z.string().min(2).max(160)).min(1).max(4),
    chartData: z.array(z.object({
      dayOffset: z.number().int().min(1).max(30),
      projectedPrice: z.number().positive(),
    }).strict()).min(3).max(3),
  }).strict()).min(1).max(4),
  regionalSignals: z.array(z.object({
    region: z.string().min(2).max(80),
    crop: z.string().min(2).max(100),
    demandChangePercent: z.number().min(-100).max(300),
    projectedDemand: z.number().nonnegative(),
    activeRequirements: z.number().int().nonnegative(),
  }).strict()).max(4),
}).strict();

const jsonSchema = (cropCount) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    crops: {
      type: "array",
      minItems: cropCount,
      maxItems: cropCount,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          productId: { type: "string" },
          projectedPrice: { type: "number", exclusiveMinimum: 0 },
          projectedDemand: { type: "number", minimum: 0 },
          riskLevel: { type: "string", enum: ["HIGH_DEFICIT", "DEFICIT", "BALANCED", "SURPLUS"] },
          recommendation: { type: "string" },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          evidence: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
          chartData: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                dayOffset: { type: "integer", minimum: 1, maximum: 30 },
                projectedPrice: { type: "number", exclusiveMinimum: 0 },
              },
              required: ["dayOffset", "projectedPrice"],
            },
          },
        },
        required: ["productId", "projectedPrice", "projectedDemand", "riskLevel", "recommendation", "confidence", "evidence", "chartData"],
      },
    },
    regionalSignals: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          region: { type: "string" },
          crop: { type: "string" },
          demandChangePercent: { type: "number", minimum: -100, maximum: 300 },
          projectedDemand: { type: "number", minimum: 0 },
          activeRequirements: { type: "integer", minimum: 0 },
        },
        required: ["region", "crop", "demandChangePercent", "projectedDemand", "activeRequirements"],
      },
    },
  },
  required: ["crops", "regionalSignals"],
});

const activeRequirement = (requirement) => !["CANCELLED", "FULFILLED", "CLOSED"].includes(requirement.status);

export function buildForecastDataset({ products = [], priceSnapshots = [], requirements = [], lots = [] }) {
  const activeRequirements = requirements.filter(activeRequirement);
  const candidates = products
    .filter((product) => product.status === "active")
    .map((product) => {
      const history = priceSnapshots
        .filter((snapshot) => snapshot.productId === product._id)
        .sort((first, second) => new Date(first.date) - new Date(second.date))
        .slice(-30)
        .map((snapshot) => ({
          date: snapshot.date,
          price: Number(snapshot.marketplaceMedian || snapshot.localReference || product.bulkPrice),
        }));
      const demand = activeRequirements.filter((requirement) => (
        requirement.productId === product._id
        || String(requirement.product || "").toLowerCase() === String(product.name || "").toLowerCase()
      ));
      const productLots = lots.filter((lot) => (
        lot.productId === product._id && !["EXPIRED", "UNAVAILABLE"].includes(lot.freshnessState)
      ));
      return {
        productId: product._id,
        crop: product.name,
        category: product.category,
        unit: product.unit || "kg",
        currentPrice: history.at(-1)?.price || Number(product.bulkPrice),
        availableSupply: productLots.length
          ? productLots.reduce((total, lot) => total + Number(lot.availableQuantity || 0), 0)
          : Number(product.availableQuantity || 0),
        urgentSupply: productLots
          .filter((lot) => ["URGENT", "SELL_SOON"].includes(lot.freshnessState))
          .reduce((total, lot) => total + Number(lot.availableQuantity || 0), 0),
        activeDemand: demand.reduce((total, requirement) => total + Number(requirement.quantity || 0), 0),
        activeRequirementCount: demand.length,
        requiredDates: demand.map((requirement) => requirement.requiredDate).filter(Boolean),
        demandRegions: [...new Set(demand.map((requirement) => requirement.location).filter(Boolean))],
        priceHistory: history,
      };
    })
    .filter((product) => product.priceHistory.length)
    .sort((first, second) => (
      second.activeRequirementCount - first.activeRequirementCount
      || second.activeDemand - first.activeDemand
      || second.priceHistory.length - first.priceHistory.length
    ))
    .slice(0, 8);

  return {
    generatedFor: new Date().toISOString(),
    horizonDays: 15,
    products: candidates,
    regionalDemand: activeRequirements.map((requirement) => ({
      productId: requirement.productId,
      crop: requirement.product,
      region: requirement.location,
      quantity: Number(requirement.quantity || 0),
      unit: requirement.unit || "kg",
      requiredDate: requirement.requiredDate,
      status: requirement.status,
    })),
  };
}

const labelDate = (value) => new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
}).format(new Date(value));

const historySample = (history) => {
  if (history.length <= 4) return history;
  const indexes = [history.length - 10, history.length - 7, history.length - 4, history.length - 1]
    .map((index) => Math.max(0, index));
  return [...new Set(indexes)].map((index) => history[index]);
};

const riskLabels = {
  HIGH_DEFICIT: "HIGH DEFICIT",
  DEFICIT: "DEFICIT RISK",
  BALANCED: "BALANCED",
  SURPLUS: "SURPLUS RISK",
};

const riskTones = { HIGH_DEFICIT: "red", DEFICIT: "amber", BALANCED: "green", SURPLUS: "amber" };

export function normalizeForecast(rawForecast, dataset, model) {
  const parsed = forecastSchema.parse(rawForecast);
  const usedIds = new Set();
  const usedRegions = new Set();
  const crops = parsed.crops.map((forecast) => {
    const source = dataset.products.find((product) => product.productId === forecast.productId);
    if (!source || usedIds.has(forecast.productId))
      throw new Error("The forecasting model returned an unknown or duplicate product");
    usedIds.add(forecast.productId);
    const currentPrice = Number(source.currentPrice);
    const projectedPrice = Number(forecast.projectedPrice.toFixed(1));
    const changePercent = currentPrice
      ? Number((((projectedPrice - currentPrice) / currentPrice) * 100).toFixed(1))
      : 0;
    const trend = changePercent > 2 ? "UP" : changePercent < -2 ? "DOWN" : "STABLE";
    const actuals = historySample(source.priceHistory).map((point, index, all) => ({
      day: labelDate(point.date),
      actual: Number(point.price.toFixed(1)),
      ...(index === all.length - 1 ? { projected: currentPrice } : {}),
    }));
    const baseDate = new Date(dataset.generatedFor).getTime();
    const projected = [...forecast.chartData]
      .sort((first, second) => first.dayOffset - second.dayOffset)
      .map((point) => ({
        day: labelDate(baseDate + point.dayOffset * DAY_MS),
        projected: Number(point.projectedPrice.toFixed(1)),
      }));
    return {
      productId: source.productId,
      crop: source.crop,
      category: source.category,
      unit: source.unit,
      trend,
      trendValue: `${changePercent > 0 ? "+" : ""}${changePercent}%`,
      currentPrice,
      projectedPrice,
      demandVolume: Number(forecast.projectedDemand.toFixed(0)),
      deficitRisk: riskLabels[forecast.riskLevel],
      riskTone: riskTones[forecast.riskLevel],
      recommendation: forecast.recommendation,
      confidence: forecast.confidence,
      evidence: forecast.evidence,
      chartData: [...actuals, ...projected],
    };
  });

  return {
    crops,
    regionalSignals: parsed.regionalSignals.map((signal) => {
      const matchingDemand = dataset.regionalDemand.filter((requirement) => (
        requirement.region.toLowerCase() === signal.region.toLowerCase()
        && requirement.crop.toLowerCase() === signal.crop.toLowerCase()
      ));
      const signalKey = `${signal.region.toLowerCase()}::${signal.crop.toLowerCase()}`;
      if (!matchingDemand.length || usedRegions.has(signalKey))
        throw new Error("The forecasting model returned an unknown or duplicate regional demand signal");
      usedRegions.add(signalKey);
      return {
        region: matchingDemand[0].region,
        crop: matchingDemand[0].crop,
        unit: matchingDemand[0].unit,
        demandChangePercent: Number(signal.demandChangePercent.toFixed(0)),
        projectedDemand: Number(signal.projectedDemand.toFixed(0)),
        activeRequirements: matchingDemand.length,
      };
    }),
    generatedAt: new Date().toISOString(),
    horizonDays: dataset.horizonDays,
    provider: "OpenAI Responses API",
    model,
    source: "Live marketplace supply, active buyer requirements, and stored price history",
    advisory: "AI projections are estimates for planning and require human review before pricing or harvest decisions.",
  };
}

const responseText = (payload) => payload.output
  ?.flatMap((item) => item.content || [])
  .find((content) => content.type === "output_text")
  ?.text;

let forecastCache = null;
let pendingForecast = null;

export async function generateDemandForecast(dataset, options = {}) {
  const apiKey = options.apiKey ?? env.openAiApiKey;
  const model = options.model || env.openAiForecastModel;
  const fetchImpl = options.fetchImpl || fetch;
  const now = Date.now();
  const signature = JSON.stringify({ products: dataset.products, regionalDemand: dataset.regionalDemand });
  if (!apiKey) {
    const error = new Error("AI demand forecasting is not configured. Add OPENAI_API_KEY to the server environment.");
    error.status = 503;
    throw error;
  }
  if (!options.force && forecastCache && forecastCache.signature === signature && now - forecastCache.createdAt < CACHE_TTL_MS)
    return forecastCache.data;
  if (!options.force && pendingForecast?.signature === signature) return pendingForecast.promise;
  if (!dataset.products.length) {
    const error = new Error("Not enough marketplace price history is available to create a forecast.");
    error.status = 422;
    throw error;
  }

  const cropCount = Math.min(4, dataset.products.length);
  const request = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          instructions: [
            "You are an agricultural demand forecasting analyst for Odisha, India.",
            `Select exactly ${cropCount} unique products from the supplied productId values and forecast the next ${dataset.horizonDays} days.`,
            "Use only the supplied platform data. Do not claim access to weather, tenders, external mandi feeds, or facts not present in the input.",
            "Price projections should follow the historical series while accounting for active demand, available supply, urgent supply, and required dates.",
            "Projected demand is the estimated quantity likely to be requested during the horizon, expressed in each product's supplied unit.",
            "Return three price points near days 5, 10, and 15. Keep recommendations practical and evidence statements tied to numeric input fields.",
            "Confidence must decrease when history or active demand evidence is sparse.",
          ].join(" "),
          input: JSON.stringify(dataset),
          text: { format: { type: "json_schema", name: "kishan_bhaiya_demand_forecast", strict: true, schema: jsonSchema(cropCount) } },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error?.message || "The AI forecasting provider could not generate a forecast.");
        error.status = 502;
        throw error;
      }
      const text = responseText(payload);
      if (!text) {
        const error = new Error("The AI forecasting provider returned no structured forecast.");
        error.status = 502;
        throw error;
      }
      let rawForecast;
      try {
        rawForecast = JSON.parse(text);
      } catch {
        const error = new Error("The AI forecasting provider returned an unreadable forecast.");
        error.status = 502;
        throw error;
      }
      const normalized = normalizeForecast(rawForecast, dataset, model);
      forecastCache = { createdAt: Date.now(), signature, data: normalized };
      return normalized;
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error("AI demand forecasting timed out. Please try again.");
        timeoutError.status = 504;
        throw timeoutError;
      }
      if (error.name === "ZodError") {
        const validationError = new Error("The AI forecasting provider returned an invalid forecast.");
        validationError.status = 502;
        throw validationError;
      }
      if (!error.status) error.status = 502;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const promise = request().finally(() => {
    pendingForecast = null;
  });
  pendingForecast = { signature, promise };
  return promise;
}

// A deterministic fallback, deliberately separate from AI demand predictions.
export function historicalPriceForecast(dataset) {
  const crops = dataset.products.slice(0, 4).map(product => {
    const history = product.priceHistory.filter(point => Number.isFinite(point.price) && point.price > 0);
    const first = history[0];
    const last = history.at(-1);
    const elapsed = Math.max(1, (new Date(last.date) - new Date(first.date)) / DAY_MS);
    const slope = (last.price - first.price) / elapsed;
    const priceAt = day => Number(Math.max(last.price * 0.7, Math.min(last.price * 1.3, last.price + slope * day)).toFixed(1));
    const projectedPrice = priceAt(dataset.horizonDays);
    const change = Number(((projectedPrice / last.price - 1) * 100).toFixed(1));
    return {
      productId: product.productId, crop: product.crop, category: product.category, unit: product.unit,
      currentPrice: last.price, projectedPrice, trend: change > 2 ? 'UP' : change < -2 ? 'DOWN' : 'STABLE',
      trendValue: `${change > 0 ? '+' : ''}${change}%`, confidence: null,
      demandVolume: product.activeDemand, deficitRisk: 'HISTORICAL TREND', riskTone: 'amber',
      recommendation: 'This estimate extends the recorded price trend, capped at a 30% change. It does not predict seasonal demand, festival effects or future supply.',
      evidence: [`${history.length} stored price observations`, `${product.activeRequirementCount} active buyer requirements`],
      chartData: [...historySample(history).map((point, index, all) => ({day:labelDate(point.date),actual:point.price,...(index === all.length-1 ? {projected:last.price} : {})})), ...[5,10,15].map(day => ({day:labelDate(new Date(dataset.generatedFor).getTime()+day*DAY_MS),projected:priceAt(day)}))],
    };
  });
  return { crops, regionalSignals: [], horizonDays:dataset.horizonDays, generatedAt:new Date().toISOString(),
    forecastType:'historical', provider:'Historical price trend', source:'Stored marketplace price observations and active requirements',
    advisory:'AI forecasting is temporarily unavailable. Historical trends are planning estimates, not AI predictions or guaranteed future prices. Demand counts show recorded requests only.' };
}
