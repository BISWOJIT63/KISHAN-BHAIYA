import { env } from "../config/env.js";

const median = (values) => {
  const ordered = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};

const asNumber = (value) => Number(String(value ?? "").replace(/[₹,]/g, ""));

export const fetchMandiBenchmarks = async (productName) => {
  if (!env.mandiPriceApiUrl || !env.dataGovApiKey || env.nodeEnv === "test") return null;
  let timeout;
  try {
    const configuredUrl = env.mandiPriceApiUrl.startsWith("http")
      ? env.mandiPriceApiUrl
      : `https://${env.mandiPriceApiUrl.replace(/^\/+/, "")}`;
    const url = new URL(configuredUrl);
    url.searchParams.set("api-key", env.dataGovApiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "100");
    url.searchParams.set("filters[commodity]", productName);
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const payload = await response.json();
    const records = payload.records || payload.data || [];
    const prices = records.map((record) => asNumber(record.modal_price ?? record.modalPrice ?? record.price)).filter(Number.isFinite);
    const benchmark = median(prices);
    return benchmark ? { benchmark, records: records.length, source: "Configured public mandi dataset", timestamp: new Date().toISOString() } : null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const priceRecommendation = ({ baseline, marketBenchmark, demandCount, distanceKm = 0 }) => {
  const demandFactor = Math.min(0.08, Math.max(-0.04, demandCount * 0.01));
  const seasonalFactor = Math.sin((new Date().getMonth() / 12) * Math.PI * 2) * 0.035;
  const transportPerKg = Math.min(3, Math.max(0, distanceKm * 0.025));
  const benchmark = marketBenchmark || baseline;
  const recommended = Math.max(1, benchmark * (1 + demandFactor + seasonalFactor) + transportPerKg);
  return {
    recommendedPrice: Number(recommended.toFixed(1)),
    benchmarkPrice: Number(benchmark.toFixed(1)),
    demandAdjustmentPercent: Number((demandFactor * 100).toFixed(1)),
    seasonalAdjustmentPercent: Number((seasonalFactor * 100).toFixed(1)),
    transportOverheadPerKg: Number(transportPerKg.toFixed(1)),
    explanation: "Recommendation combines the mandi benchmark, active local demand, a seasonal adjustment, and transparent transport overhead. It is advisory, not a guaranteed price.",
  };
};
