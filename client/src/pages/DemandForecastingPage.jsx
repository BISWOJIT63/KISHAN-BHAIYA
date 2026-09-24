import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Leaf,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, apiError, getData } from "../api/client.js";
import { PageMotion } from "../components/Motion.jsx";
import { ErrorState, LoadingState } from "../components/UI.jsx";
import { money, number } from "../utils/format.js";

const riskColors = {
  red: "bg-red-100 text-red-800 border-red-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function ForecastHeader({ forecast }) {
  return <header className="border-b border-forest-100 bg-forest-950 px-5 py-7 text-white sm:px-8 sm:py-8">
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-lime-200"><Sparkles className="h-3.5 w-3.5" /> Marketplace intelligence</span>
      <span className="rounded-full border border-white/20 px-3 py-1 text-forest-100">{forecast?.horizonDays || 15}-day outlook</span>
    </div>
    <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">Marketplace price projections</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-forest-100/85">Compare current prices and projected trends, then explore the demand behind each crop.</p>
    {forecast?.generatedAt && <p className="mt-4 text-xs text-forest-100/70">Updated {new Date(forecast.generatedAt).toLocaleString()}</p>}
  </header>;
}

export function MarketPriceForecastPage() {
  const gradientId = useId().replaceAll(":", "");
  const [selectedCropIndex, setSelectedCropIndex] = useState(0);
  const { data: forecast, isLoading, error, refetch, isFetching, fetchStatus } = useQuery({
    queryKey: ["ai-demand-forecast"],
    queryFn: ({ signal }) => getData(api.get("/demand-forecast", { timeout: 35_000, signal })),
    retry: (count, error) => count < 1 && (!error.response || error.response.status >= 500),
    retryDelay: 1500,
    staleTime: 14 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const crops = forecast?.crops || [];
  const activeCrop = crops[Math.min(selectedCropIndex, Math.max(0, crops.length - 1))];

  if (!activeCrop && (isLoading || isFetching || fetchStatus === "paused")) {
    return (
      <section className="min-w-0 overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-soft">
        <ForecastHeader />
        <div className="min-w-0 space-y-6 bg-forest-50/30 p-4 sm:p-6 lg:p-8">
          <div role="status" aria-live="polite" aria-busy="true" className="flex items-start gap-3 rounded-xl border border-forest-100 bg-white p-5 text-sm leading-6 text-gray-600">
            <LoaderCircle className="mt-1 h-5 w-5 shrink-0 animate-spin text-forest-700" />
            <div><p className="font-semibold text-forest-950">{fetchStatus === "paused" ? "Waiting for your connection…" : "Loading marketplace price projections…"}</p><p>{fetchStatus === "paused" ? "The request will resume when you are online." : "Analysing demand, supply and price history. This can take up to 30 seconds."}</p></div>
          </div>
          <LoadingState cards={4} />
        </div>
      </section>
    );
  }

  if (!activeCrop) {
    return (
      <section className="min-w-0 overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-soft">
        <ForecastHeader />
        <div className="min-w-0 space-y-6 bg-forest-50/30 p-4 sm:p-6 lg:p-8">
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-display text-lg font-bold text-amber-950">Price projections are unavailable</h3><p className="mt-2 break-words text-sm leading-6 text-amber-900">{error ? apiError(error) : "The API returned no crop projections. Please try again."}</p><button type="button" className="btn-primary mt-4" onClick={() => refetch()}><RefreshCw className="h-4 w-4" />Retry forecast</button></div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-soft">
      <ForecastHeader forecast={forecast} />
      {forecast.forecastType === "historical" && <p role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">AI forecasting is unavailable. Showing estimates from stored price history. Use Refresh forecast to retry the AI service.</p>}
      <div className="min-w-0 space-y-6 bg-forest-50/30 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-gray-600">Select a crop to explore its price outlook</p>
          <button className="btn-secondary bg-white" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing…" : "Refresh forecast"}
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Refresh failed. Showing the last successful projection. Use Refresh forecast to retry.</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {crops.map((item, index) => {
            const isSelected = selectedCropIndex === index;
            const isUp = item.trend === "UP";
            const isDown = item.trend === "DOWN";
            return (
              <button
                key={item.productId}
                type="button"
                onClick={() => setSelectedCropIndex(index)}
                aria-pressed={isSelected}
                className={`group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 text-left transition duration-200 sm:p-5 ${
                  isSelected
                    ? "border-forest-500 shadow-lift ring-2 ring-forest-100"
                    : "border-gray-200 shadow-sm hover:-translate-y-0.5 hover:border-forest-300 hover:shadow-lift"
                }`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${isSelected ? "bg-forest-600" : "bg-gray-200 group-hover:bg-forest-300"}`} />
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-forest-600 text-white" : "bg-forest-50 text-forest-700"}`}>
                    <Leaf className="h-5 w-5" />
                  </span>
                  <span className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-extrabold ${
                    isUp
                      ? "border-green-200 bg-green-50 text-green-800"
                      : isDown
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}>
                    {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                    {item.trendValue}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-gray-500">{item.category}</p>
                  <h3 className="mt-1 min-h-10 break-words font-display text-base font-bold leading-5 text-gray-950">{item.crop}</h3>
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-forest-50/70 p-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500">Current</p>
                    <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-gray-900">{money(item.currentPrice)}<span className="text-[10px] font-medium text-gray-500">/{item.unit}</span></p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-gray-500">{forecast.forecastType === "historical" ? "Trend estimate" : "AI forecast"}</p>
                    <p className="mt-0.5 font-display text-sm font-bold tabular-nums text-forest-700">{money(item.projectedPrice)}<span className="text-[10px] font-medium text-gray-500">/{item.unit}</span></p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-forest-600" /> {item.confidence == null ? "Based on stored price history" : `${item.confidence}% model confidence`}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <span className={`rounded border px-2.5 py-0.5 text-[10px] font-bold ${riskColors[activeCrop.riskTone] || riskColors.amber}`}>
                  {activeCrop.deficitRisk}
                </span>
                <h2 className="mt-1.5 text-lg font-bold text-gray-900 sm:text-xl">{activeCrop.crop} — price outlook</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {forecast.forecastType === "historical" ? "Recorded open demand:" : "Projected demand:"} <strong>{number(activeCrop.demandVolume)} {activeCrop.unit}</strong>{forecast.forecastType !== "historical" && <> over {forecast.horizonDays} days</>}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 self-start rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                <span className="flex items-center gap-1 text-gray-600"><span className="h-2.5 w-2.5 rounded-full bg-[#e7a52e]" /> Actual</span>
                <span className="flex items-center gap-1 text-gray-600"><span className="h-2.5 w-2.5 rounded-full bg-[#1d5f41]" /> Projected</span>
              </div>
            </div>
            <div className="h-64 w-full min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activeCrop.chartData} margin={{ top: 12, right: 12, bottom: 8, left: -18 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d5f41" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1d5f41" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f4" />
                  <XAxis minTickGap={24} dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis width={58} tickFormatter={value => `₹${value}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 3", "dataMax + 3"]} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dce6de", fontSize: 12 }} formatter={(value) => [`₹${value}/${activeCrop.unit}`, "Price"]} />
                  <Area type="monotone" dataKey="projected" stroke="#1d5f41" strokeWidth={3} fill={`url(#${gradientId})`} connectNulls />
                  <Line type="monotone" dataKey="actual" stroke="#e7a52e" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50/70 p-4 text-xs leading-relaxed text-green-950">
              <strong>{forecast.forecastType === "historical" ? "Trend guidance:" : "AI advisory:"}</strong> {activeCrop.recommendation}
              <div className="mt-2 text-[11px] text-green-800">Evidence: {activeCrop.evidence.join(" · ")}</div>
            </div>
          </section>

          <aside className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <div className="mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-[#1d5f41]" /><h3 className="font-bold text-gray-900">Regional demand signals</h3></div>
              <p className="mb-4 text-xs text-gray-500">AI projections grounded in active buyer requirements by region.</p>
              <div className="space-y-3">
                {!forecast.regionalSignals.length && <p className="rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-500">No regional demand signals are available yet.</p>}
                {forecast.regionalSignals.map((zone) => (
                  <div key={`${zone.region}-${zone.crop}`} className="rounded-lg border border-gray-200 border-l-4 border-l-forest-400 bg-white p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-900">{zone.region}</p>
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {zone.demandChangePercent >= 0 ? "+" : ""}{zone.demandChangePercent}%
                      </span>
                    </div>
                    <p className="mt-1 text-gray-500">{zone.crop} · {number(zone.projectedDemand)} {zone.unit} forecast</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#1d5f41]">{zone.activeRequirements} active requirement{zone.activeRequirements === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/demand-board" className="btn-primary mt-6 flex w-full items-center justify-center gap-1.5 py-2.5 text-center text-xs font-bold">
              View live demand board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </aside>
        </div>

        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          {forecast.advisory} Source: {forecast.source}.
        </p>
      </div>
    </section>
  );
}

export function DemandForecastingPage() {
  const [period, setPeriod] = useState('current');
  const [festival, setFestival] = useState('Durga Puja / Dussehra');
  const [showPrices, setShowPrices] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['seasonal-demand', period, festival], queryFn: () => getData(api.get('/seasonal-demand', { params: { period, festival } })) });
  return <PageMotion className="container-page py-10">
    <p className="eyebrow">Crop planning</p><h1 className="mt-2 font-display text-3xl font-bold">Seasonal & festival demand outlook</h1>
    <p className="mt-3 text-gray-600">Explore which fruits and vegetables to plan for this season, next season or an upcoming festival.</p>
    <div className="my-6 flex flex-wrap gap-3">{[['current','Current season'],['upcoming','Upcoming season'],['festival','Festival planning']].map(([value,label]) => <button key={value} className={period === value ? 'btn-primary' : 'btn-secondary'} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div>
    {period === 'festival' && <label className="block max-w-md mb-6"><span className="label">Festival you are preparing for</span><select className="input" value={festival} onChange={e => setFestival(e.target.value)}>{['Durga Puja / Dussehra','Diwali','Rath Yatra','Makar Sankranti'].map(name => <option key={name}>{name}</option>)}</select></label>}
    {isLoading ? <LoadingState /> : error ? <ErrorState message={apiError(error)} onRetry={refetch} /> : data && <><h2 className="section-title">{data.title}</h2><p className="my-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.basis}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.crops.map(item => <article className="card p-6" key={item.crop}><Leaf className="h-6 w-6 text-forest-700" /><h3 className="mt-3 font-display text-xl font-bold">{item.crop}</h3><p className="my-2 text-sm font-semibold text-forest-700">{item.outlook}</p><p className="text-sm text-gray-600">{item.reason}</p><p className="mt-4 text-xs text-gray-500">{item.requirements} active buyer requirement{item.requirements === 1 ? '' : 's'} across delivery dates</p></article>)}</div></>}
    <div className="mt-10 border-t border-gray-200 pt-6">
      <button type="button" aria-expanded={showPrices} aria-controls="market-price-projections" className="flex w-full items-center justify-between gap-4 rounded-xl border border-forest-200 bg-white p-5 text-left shadow-sm transition hover:bg-forest-50" onClick={() => setShowPrices(!showPrices)}>
        <span className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-100 text-forest-700"><BarChart3 className="h-5 w-5" /></span><span><span className="block font-display font-bold text-forest-950">Marketplace price projections</span><span className="mt-1 block text-xs leading-5 text-gray-500">Compare current prices, trends and regional demand</span></span></span>
        <ChevronDown className={showPrices ? 'h-5 w-5 shrink-0 rotate-180 text-forest-700' : 'h-5 w-5 shrink-0 text-forest-700'} />
      </button>
      <div id="market-price-projections" hidden={!showPrices} className="mt-5 min-w-0">{showPrices && <MarketPriceForecastPage />}</div>
    </div>
  </PageMotion>;
}
