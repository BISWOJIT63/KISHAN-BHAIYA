import { describe, expect, it, vi } from "vitest";
import { buildSeedData } from "../seed/data.js";
import {
  buildForecastDataset,
  historicalPriceForecast,
  generateDemandForecast,
  normalizeForecast,
} from "../services/demandForecasting.js";

const buildDataset = () => {
  const seed = buildSeedData();
  return buildForecastDataset({
    products: seed.products,
    priceSnapshots: seed.priceSnapshots,
    requirements: seed.requirements,
    lots: seed.lots,
  });
};

const modelOutput = (dataset) => ({
  crops: dataset.products.slice(0, 4).map((product, index) => ({
    productId: product.productId,
    projectedPrice: Number((product.currentPrice * (1.02 + index * 0.01)).toFixed(1)),
    projectedDemand: Math.max(product.activeDemand, 100),
    riskLevel: index === 0 ? "HIGH_DEFICIT" : "BALANCED",
    recommendation: `Review ${product.crop} supply against the active buyer requirement before confirming harvest plans.`,
    confidence: 78 - index,
    evidence: [`${product.activeDemand} units of active demand`, `${product.availableSupply} units of available supply`],
    chartData: [5, 10, 15].map((dayOffset) => ({
      dayOffset,
      projectedPrice: Number((product.currentPrice * (1 + dayOffset / 500)).toFixed(1)),
    })),
  })),
  regionalSignals: dataset.regionalDemand.slice(0, 2).map((demand) => ({
    region: demand.region,
    crop: demand.crop,
    demandChangePercent: 12,
    projectedDemand: demand.quantity * 1.12,
    activeRequirements: 99,
  })),
});

describe("AI demand forecasting", () => {
  it("builds a privacy-safe model dataset from live marketplace records", () => {
    const dataset = buildDataset();
    expect(dataset.products).toHaveLength(8);
    expect(dataset.products[0].activeRequirementCount).toBeGreaterThan(0);
    expect(dataset.products[0].priceHistory).toHaveLength(30);
    expect(dataset.regionalDemand[0]).not.toHaveProperty("buyerId");
    expect(dataset.regionalDemand[0]).not.toHaveProperty("buyer");
  });

  it("grounds model output in stored product and requirement data", () => {
    const dataset = buildDataset();
    const normalized = normalizeForecast(modelOutput(dataset), dataset, "gpt-4o-mini");
    expect(normalized.crops).toHaveLength(4);
    expect(normalized.crops[0].crop).toBe(dataset.products[0].crop);
    expect(normalized.crops[0].chartData.some((point) => point.actual)).toBe(true);
    expect(normalized.regionalSignals[0].activeRequirements).toBe(1);
    expect(normalized.provider).toBe("OpenAI Responses API");
  });

  it("requests strict structured output from the Responses API", async () => {
    const dataset = buildDataset();
    const output = modelOutput(dataset);
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }],
      }),
    }));
    const result = await generateDemandForecast(dataset, {
      apiKey: "test-key",
      model: "gpt-4o-mini",
      fetchImpl,
      force: true,
    });
    const [url, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(body.store).toBe(false);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
    expect(result.crops).toHaveLength(4);
  });
});

it('labels historical fallback and keeps estimates bounded without fake AI confidence', () => {
  const result = historicalPriceForecast(buildDataset());
  expect(result.forecastType).toBe('historical');
  expect(result.crops.length).toBeGreaterThan(0);
  for (const crop of result.crops) {
    expect(crop.confidence).toBeNull();
    expect(crop.projectedPrice).toBeGreaterThanOrEqual(crop.currentPrice * 0.7 - 0.1);
    expect(crop.projectedPrice).toBeLessThanOrEqual(crop.currentPrice * 1.3 + 0.1);
  }
});
