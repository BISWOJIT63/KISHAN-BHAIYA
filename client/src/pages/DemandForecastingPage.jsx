import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  BarChart3,
  Calendar,
  MapPin,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Layers,
  Leaf,
  DollarSign,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { money } from "../utils/format.js";

const forecastSummary = [
  {
    crop: "Fresh Desi Tomato",
    category: "Vegetables",
    trend: "UP",
    trendValue: "+18%",
    currentPrice: 28,
    projectedPrice: 33,
    demandVolume: "450 Metric Tonnes",
    deficitRisk: "HIGH DEFICIT",
    riskColor: "bg-red-100 text-red-800 border-red-200",
    recommendation: "Farmers: Stagger harvest lots over next 10 days to capture peak ₹33/kg realizations.",
    chartData: [
      { day: "Aug 25", actual: 26, projected: 26 },
      { day: "Aug 28", actual: 28, projected: 28 },
      { day: "Sep 01", actual: 28, projected: 29 },
      { day: "Sep 05", projected: 31 },
      { day: "Sep 10", projected: 33 },
      { day: "Sep 15", projected: 32 },
      { day: "Sep 20", projected: 30 },
    ],
  },
  {
    crop: "Nasik Red Onion",
    category: "Vegetables",
    trend: "STABLE",
    trendValue: "+2%",
    currentPrice: 32,
    projectedPrice: 33,
    demandVolume: "820 Metric Tonnes",
    deficitRisk: "BALANCED",
    riskColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    recommendation: "FPOs: Maintain standard ventilated crate storage. Steady urban retail demand expected.",
    chartData: [
      { day: "Aug 25", actual: 31, projected: 31 },
      { day: "Aug 28", actual: 32, projected: 32 },
      { day: "Sep 01", actual: 32, projected: 32 },
      { day: "Sep 05", projected: 33 },
      { day: "Sep 10", projected: 33 },
      { day: "Sep 15", projected: 32.5 },
      { day: "Sep 20", projected: 32 },
    ],
  },
  {
    crop: "Jyoti Potato",
    category: "Vegetables",
    trend: "DOWN",
    trendValue: "-6%",
    currentPrice: 24,
    projectedPrice: 22.5,
    demandVolume: "650 Metric Tonnes",
    deficitRisk: "SURPLUS INCOMING",
    riskColor: "bg-amber-100 text-amber-800 border-amber-200",
    recommendation: "Producers: Lock in forward bulk contracts or utilize solar cold depots to avoid distress selling.",
    chartData: [
      { day: "Aug 25", actual: 25, projected: 25 },
      { day: "Aug 28", actual: 24, projected: 24 },
      { day: "Sep 01", actual: 24, projected: 24 },
      { day: "Sep 05", projected: 23.5 },
      { day: "Sep 10", projected: 22.5 },
      { day: "Sep 15", projected: 22 },
      { day: "Sep 20", projected: 22.5 },
    ],
  },
  {
    crop: "Koraput Organic Turmeric",
    category: "Spices",
    trend: "UP",
    trendValue: "+14%",
    currentPrice: 175,
    projectedPrice: 198,
    demandVolume: "140 Metric Tonnes",
    deficitRisk: "HIGH EXPORT DEMAND",
    riskColor: "bg-purple-100 text-purple-800 border-purple-200",
    recommendation: "High institutional demand from organic retail chains. Certification passports boost realization by 20%.",
    chartData: [
      { day: "Aug 25", actual: 165, projected: 165 },
      { day: "Aug 28", actual: 172, projected: 172 },
      { day: "Sep 01", actual: 175, projected: 178 },
      { day: "Sep 05", projected: 185 },
      { day: "Sep 10", projected: 192 },
      { day: "Sep 15", projected: 198 },
      { day: "Sep 20", projected: 195 },
    ],
  },
];

const regionalDemandSurge = [
  { region: "Bhubaneswar Urban Hub", crop: "Tomatoes & Green Leafy", surge: "+32% Demand", buyers: "48 Active Buyers" },
  { region: "Cuttack Wholesale Mandi", crop: "Onions & Potatoes", surge: "+18% Demand", buyers: "34 Active Buyers" },
  { region: "Puri Coastal Zone", crop: "Coconuts & Fruits", surge: "+25% Demand", buyers: "29 Active Buyers" },
  { region: "Rourkela Industrial Depot", crop: "Grains & Pulses", surge: "+15% Demand", buyers: "22 Active Buyers" },
];

export function DemandForecastingPage() {
  const [selectedCropIndex, setSelectedCropIndex] = useState(0);
  const activeCrop = forecastSummary[selectedCropIndex];

  return (
    <PageMotion className="bg-[#f4f4f8] text-[#17221d] min-h-screen pb-16 font-sans">
      
      {/* Header Banner */}
      <section className="bg-[#14432e] text-white pt-10 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge bg-[#fffa43] text-[#14432e] font-bold text-xs uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
              <Sparkles className="w-3.5 h-3.5" />
              AI Market Intelligence &amp; Demand Forecasting
            </span>
            <span className="badge bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20">
              15–30 Day Predictive Horizon
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Agricultural Demand &amp; Price Forecasting
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/85 max-w-3xl leading-relaxed">
            Predictive intelligence analyzing mandi arrivals, urban consumption patterns, seasonal weather models, and institutional procurement tenders to forecast crop demand and price trends.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8">
        
        {/* Crop Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {forecastSummary.map((item, index) => {
            const isSelected = selectedCropIndex === index;
            const isUp = item.trend === "UP";
            return (
              <button
                key={item.crop}
                type="button"
                onClick={() => setSelectedCropIndex(index)}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between shadow-sm ${
                  isSelected
                    ? "bg-white border-[#1d5f41] ring-2 ring-[#1d5f41]/30 shadow-md"
                    : "bg-white/90 border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      {item.category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isUp
                          ? "bg-green-100 text-green-800"
                          : item.trend === "DOWN"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {item.trendValue}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 mt-2 truncate">
                    {item.crop}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Current: <strong>{money(item.currentPrice)}/kg</strong>
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Forecast 15D:</span>
                  <span className="font-bold text-[#1d5f41]">{money(item.projectedPrice)}/kg</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Crop Deep-Dive Chart & Actionable Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Main Chart (2-cols) */}
          <section className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${activeCrop.riskColor}`}>
                  {activeCrop.deficitRisk}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5">
                  {activeCrop.crop} — Price Trajectory &amp; Forecast
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Projected demand: <strong>{activeCrop.demandVolume}</strong> across regional hubs
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <span className="flex items-center gap-1 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1d5f41]" /> Actual Realized
                </span>
                <span className="flex items-center gap-1 text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e7a52e]" /> AI Projected
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeCrop.chartData}>
                  <defs>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d5f41" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1d5f41" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f4" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 3', 'dataMax + 3']} />
                  <Tooltip formatter={(value) => [`₹${value}/kg`, "Price"]} />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stroke="#1d5f41"
                    strokeWidth={3}
                    fill="url(#colorProjected)"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#e7a52e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recommendation Box */}
            <div className="mt-5 p-4 rounded-xl bg-green-50/70 border border-green-200 text-xs text-green-950 leading-relaxed">
              <strong>💡 Advisory for Producers &amp; FPOs:</strong> {activeCrop.recommendation}
            </div>
          </section>

          {/* Demand Surge Zones Sidebar */}
          <aside className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-[#1d5f41]" />
                <h3 className="font-bold text-base text-gray-900">
                  Regional Demand Surge
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                High-volume procurement deficit zones needing immediate harvest supply.
              </p>

              <div className="space-y-3">
                {regionalDemandSurge.map((zone) => (
                  <div key={zone.region} className="p-3.5 rounded-xl bg-[#fafafc] border border-gray-100 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900">{zone.region}</p>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {zone.surge}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">{zone.crop}</p>
                    <p className="text-[11px] text-[#1d5f41] font-semibold mt-1">
                      {zone.buyers}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link
                to="/demand-board"
                className="btn-primary w-full text-xs font-bold py-2.5 text-center justify-center flex items-center gap-1.5"
              >
                <span>View Live Demand Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

        </div>

      </main>

    </PageMotion>
  );
}
