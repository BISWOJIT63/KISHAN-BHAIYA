import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  motion as Motion,
  AnimatePresence,
  useInView,
  animate,
} from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, FreeMode } from "swiper/modules";

// Swiper Styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/free-mode";

import {
  Search,
  ArrowRight,
  ShoppingBasket,
  Tractor,
  Truck,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Store,
  UsersRound,
  Leaf,
  Wheat,
  BellRing,
  ChevronRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Package,
  Clock,
  Radio,
  Newspaper,
  Wind,
  Play,
  Video,
  BarChart3,
  MapPin,
} from "lucide-react";
import { api, getData } from "../api/client.js";
import { LoadingState } from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { money } from "../utils/format.js";

function AnimatedCounter({
  value,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toLocaleString();

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);

  // Individual buyers (consumers) cannot access landing / - they always start at Urban Stores
  if (user?.role === "consumer") {
    return <Navigate to="/stores" replace />;
  }

  const retailShoppingVisible = user?.role !== "business_buyer";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);

  // Urgent Farmer & Weather Notifications Ticker
  const urgentAlerts = [
    {
      id: "cyclone-alert",
      type: "CYCLONE & WEATHER ALERT",
      icon: Wind,
      badge: "CRITICAL ADVISORY",
      title:
        "IMD Weather Watch: Deep Depression in Bay of Bengal expected to bring heavy rainfall across coastal Odisha, Andhra & Bengal districts.",
      detail:
        "Farmers are advised to complete ready vegetable & paddy lot harvesting before Sep 4. Emergency cold-storage buffer depots activated.",
      actionText: "Read Protocol",
      actionLink: "/news",
    },
    {
      id: "subsidy-alert",
      type: "GOVERNMENT SCHEME & MSP",
      icon: Sparkles,
      badge: "GOVT NOTIFICATION",
      title:
        "Kharif 2026 MSP Rates Announced: 8% increase in minimum support prices for pulses, oilseeds and coarse cereals.",
      detail:
        "Direct Benefit Transfer (DBT) verification open on the portal for all registered FPO member farmers.",
      actionText: "Rate Chart",
      actionLink: "/news",
    },
    {
      id: "demand-alert",
      type: "LIVE DEMAND SURGE",
      icon: TrendingUp,
      badge: "HIGH DEMAND",
      title:
        "Urban Buyer Demand Alert: 120+ Metric Tonnes requirement for Grade-A Red Onions and Fresh Tomatoes across state depots.",
      detail:
        "Producers can submit quotation bids immediately through their Seller Workspaces.",
      actionText: "Demand Board",
      actionLink: "/demand-forecasting",
    },
  ];

  // Auto-rotate the urgent notification every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAlertIndex((prev) => (prev + 1) % urgentAlerts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [urgentAlerts.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!retailShoppingVisible) {
      navigate("/bulk");
      return;
    }
    const catQuery =
      selectedCategory !== "all"
        ? `&category=${encodeURIComponent(selectedCategory)}`
        : "";
    navigate(`/marketplace?q=${encodeURIComponent(searchQuery)}${catQuery}`);
  };

  const categories = [
    {
      name: "Vegetables",
      icon: Leaf,
      count: "480+ Lots",
      desc: "Fresh tomatoes, onions, potatoes, greens & daily farm harvests.",
    },
    {
      name: "Fruits",
      icon: Sparkles,
      count: "290+ Lots",
      desc: "Seasonal mangoes, apples, citrus, bananas & orchard produce.",
    },
    {
      name: "Grains",
      icon: Wheat,
      count: "350+ Lots",
      desc: "Basmati, Sona Masoori, wheat, millets & whole pulses.",
    },
    {
      name: "Pulses",
      icon: Package,
      count: "210+ Lots",
      desc: "Arhar, Chana, Moong, Urad directly sourced from grower FPOs.",
    },
    {
      name: "Spices",
      icon: TrendingUp,
      count: "160+ Lots",
      desc: "Authentic Koraput turmeric, dry red chillies, cardamom & spices.",
    },
    {
      name: "Organic",
      icon: ShieldCheck,
      count: "190+ Lots",
      desc: "Certified zero-chemical naturally grown crops with lot passports.",
    },
  ];

  const quickStats = [
    {
      label: "Active Farm Lots",
      value: 1450,
      suffix: "+",
      sub: "Verified inventory",
    },
    {
      label: "FPO Collectives",
      value: 180,
      suffix: "+",
      sub: "Aggregated supply",
    },
    {
      label: "Daily Mandi Rates",
      value: 450,
      suffix: "+",
      sub: "Real-time pricing",
    },
    {
      label: "Tracked Trips",
      value: 98.4,
      suffix: "%",
      decimals: 1,
      sub: "On-time delivery",
    },
  ];

  // AI Demand Forecasting Highlights for Homepage
  const demandForecastHighlights = [
    {
      crop: "Fresh Desi Tomato",
      category: "Vegetables",
      trend: "UP",
      trendValue: "+18%",
      currentPrice: 28,
      projectedPrice: 33,
      status: "High Deficit Zone",
      statusColor: "bg-red-50 text-red-700 border-red-200",
      advice: "Optimal harvesting window in 5–10 days.",
    },
    {
      crop: "Nasik Red Onion",
      category: "Vegetables",
      trend: "STABLE",
      trendValue: "+2%",
      currentPrice: 32,
      projectedPrice: 33,
      status: "Balanced Supply",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      advice: "Steady urban retail demand projected.",
    },
    {
      crop: "Jyoti Potato",
      category: "Vegetables",
      trend: "DOWN",
      trendValue: "-6%",
      currentPrice: 24,
      projectedPrice: 22.5,
      status: "Surplus Expected",
      statusColor: "bg-amber-50 text-amber-700 border-amber-200",
      advice: "Lock forward wholesale contracts now.",
    },
    {
      crop: "Koraput Turmeric",
      category: "Spices",
      trend: "UP",
      trendValue: "+14%",
      currentPrice: 175,
      projectedPrice: 198,
      status: "High B2B Demand",
      statusColor: "bg-purple-50 text-purple-700 border-purple-200",
      advice: "Digital quality passports boost realization.",
    },
  ];

  // Government & Agriculture News Highlights
  const allAgriNews = [
    {
      id: "news-cyclone-1",
      category: "weather",
      tag: "CYCLONE ADVISORY",
      tagColor: "bg-red-100 text-red-800 border-red-200",
      title:
        "IMD Cyclone Alert: Precautionary Protocols for Coastal Paddy & Vegetable Farmers",
      summary:
        "Advisory on field drainage, temporary crop netting, early harvesting of perishable vegetables, and safe storage in elevated FPO collection depots.",
      date: "Sep 01, 2026",
      source: "IMD Agromet",
      image:
        "https://images.unsplash.com/photo-1514632595-4944383fa27c?auto=format&fit=crop&w=600&q=80",
      hasVideo: true,
      readTime: "3 min",
    },
    {
      id: "news-msp-2",
      category: "msp",
      tag: "MSP & SCHEMES",
      tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      title:
        "Cabinet Approves Kharif 2026 MSP Rates with Direct Digital Settlements for FPOs",
      summary:
        "Minimum Support Prices (MSP) hiked up to 8.2% with automated 48-hour bank clearance for registered FPO member farmers.",
      date: "Aug 31, 2026",
      source: "Ministry of Agri",
      image:
        "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
      hasVideo: true,
      readTime: "2 min",
    },
    {
      id: "news-tech-3",
      category: "tech",
      tag: "AGRI INNOVATION",
      tagColor: "bg-blue-100 text-blue-800 border-blue-200",
      title:
        "Solar-Powered 5MT Micro Cold Storage Units Deployed Across 45 Rural Hubs",
      summary:
        "Decentralized solar cold rooms enable smallholder farmers to store harvested tomatoes and vegetables for up to 21 days without grid power.",
      date: "Aug 30, 2026",
      source: "ICAR Tech",
      image:
        "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80",
      hasVideo: true,
      readTime: "4 min",
    },
  ];

  // Role Details
  const rolesData = [
    {
      id: "farmer",
      title: "Individual Farmers",
      tagline: "Producers & Growers",
      icon: Tractor,
      image:
        "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80",
      description:
        "List ready harvests, receive buyer quote requests, view mandi rates, and receive guaranteed digital bank payments.",
      capabilities: [
        "Farm-Gate Listing",
        "Mandi Prices",
        "Quality Passports",
        "Bank Settlements",
      ],
      actionText: "Farmer Workspace",
      actionLink: user?.role === "farmer" ? "/seller/dashboard" : "/register",
    },
    {
      id: "fpo",
      title: "FPO Collectives",
      tagline: "Farmer Producer Orgs",
      icon: UsersRound,
      image:
        "https://images.unsplash.com/photo-1589923188651-268a9765e432?auto=format&fit=crop&w=800&q=80",
      description:
        "Aggregate supply across member farmers, quote for institutional tenders, and disburse automated member payouts.",
      capabilities: [
        "Supply Aggregation",
        "Bulk Tenders",
        "Member Ledger",
        "Cold-Chain Hubs",
      ],
      actionText: "FPO Aggregation",
      actionLink:
        user?.role === "fpo_manager" ? "/fpo/aggregation" : "/register",
    },
    {
      id: "buyer",
      title: "Buyers & Retailers",
      tagline: "Wholesale & Enterprise",
      icon: ShoppingBasket,
      image:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
      description:
        "Source verified farm produce directly with quality metrics, lot passports, and scheduled multi-drop deliveries.",
      capabilities: [
        "Direct Sourcing",
        "Post Tenders",
        "Traceable Origin",
        "Express Delivery",
      ],
      actionText: "Procurement Portal",
      actionLink: user?.role === "business_buyer" ? "/bulk" : "/marketplace",
    },
    {
      id: "logistics",
      title: "Drivers & Fleet",
      tagline: "Smart Transport Fleet",
      icon: Truck,
      image:
        "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80",
      description:
        "Accept optimized pickup dispatches, utilize vehicle load capacity with zero dead-mile returns, and log proof of delivery.",
      capabilities: [
        "Route Planner",
        "Reefer Tracking",
        "Proof of Delivery",
        "Trip Settlements",
      ],
      actionText: "Logistics Dashboard",
      actionLink:
        user?.role === "driver" || user?.role === "logistics_partner"
          ? "/logistics"
          : "/register",
    },
    {
      id: "stores",
      title: "Urban Stores",
      tagline: "Neighborhood Depots",
      icon: Store,
      image:
        "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
      description:
        "Operate licensed micro-depots, receive daily fresh consolidations, and service consumers with express delivery.",
      capabilities: [
        "Depot Inventory",
        "Order Fulfillment",
        "Driver Allocation",
        "Daily Margins",
      ],
      actionText: "Store Operations",
      actionLink: "/stores",
    },
    {
      id: "admin",
      title: "Certifiers & Admin",
      tagline: "Governance & Quality",
      icon: ShieldCheck,
      image:
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
      description:
        "Verify farmer credentials, audit quality lab certifications, resolve platform escalations, and maintain governance.",
      capabilities: [
        "Verification",
        "Quality Testing",
        "Dispute Resolution",
        "Audit Logs",
      ],
      actionText: "Admin Center",
      actionLink: user?.role === "admin" ? "/admin" : "/login",
    },
  ];
  const visibleRolesData = retailShoppingVisible
    ? rolesData
    : rolesData.filter((role) => role.id !== "stores");

  const currentAlert = urgentAlerts[activeAlertIndex];

  return (
    <PageMotion>
      <div className="bg-[#fafafa] text-[#171717] font-sans">
        {/* ══════════════════════════════════════════════════════════
            1. LIVE URGENT NOTIFICATIONS & CYCLONE TICKER
        ══════════════════════════════════════════════════════════ */}
        <div className="bg-forest-950 text-white border-b border-forest-800">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-hidden">
              <div className="flex items-center gap-1 shrink-0 bg-red-600/90 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded tracking-wider animate-pulse">
                <Radio className="w-3 h-3" />
                <span>Live Alert</span>
              </div>

              <div className="relative h-5 sm:h-6 flex items-center flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <Motion.div
                    key={currentAlert.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-1.5 text-xs truncate"
                  >
                    <span className="font-bold text-lime-300 shrink-0 hidden sm:inline text-[11px]">
                      [{currentAlert.type}]:
                    </span>
                    <span className="truncate text-white/95 text-[11px] sm:text-xs font-medium">
                      {currentAlert.title}
                    </span>
                  </Motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              <div className="flex gap-1">
                {urgentAlerts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveAlertIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeAlertIndex === i
                        ? "bg-lime-300 w-3.5"
                        : "bg-white/40 w-1.5 hover:bg-white/70"
                    }`}
                    aria-label={`Show alert ${i + 1}`}
                  />
                ))}
              </div>
              <Link
                to={currentAlert.actionLink}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded border border-white/20 transition flex items-center gap-1 shrink-0"
              >
                <span>{currentAlert.actionText}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            2. PORTAL HERO HEADER WITH VISIBLE UNSPLASH FARM LANDSCAPE
        ══════════════════════════════════════════════════════════ */}
        <section className="relative text-white pt-10 sm:pt-14 pb-16 sm:pb-20 px-3.5 sm:px-6 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80"
            alt="Agricultural landscape of India"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Reduced gradient color overlay to make farm landscape image clearly visible */}
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/50 via-forest-900/30 to-forest-950/65" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-forest-900/80 text-white text-[11px] font-semibold px-3.5 py-1 rounded-full border border-white/20 mb-3 shadow-md backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5 text-lime-300" />
              <span>National Farm-to-Market Unified Portal</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
              Empowering India’s Farmers, FPOs &amp; Buyers
            </h1>
            <p className="mt-2.5 text-xs sm:text-sm text-white/95 max-w-xl mx-auto drop-shadow font-medium">
              Real-time produce marketplace, verified lot quality passports,
              live cyclone advisories, and smart rural cold-chain transport.
            </p>

            {/* Central Search Bar */}
            <form
              onSubmit={handleSearch}
              className="mt-6 max-w-2xl mx-auto bg-white/98 rounded-xl p-1 shadow-xl flex flex-col sm:flex-row items-center gap-1 text-gray-800 border border-white/40"
            >
              <div className="flex items-center w-full sm:w-auto flex-1 px-2.5">
                <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search produce, mandi rates, or lot ID..."
                  className="w-full text-xs sm:text-sm text-gray-900 bg-transparent py-2 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-200 px-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-gray-700 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Grains">Grains</option>
                  <option value="Pulses">Pulses</option>
                  <option value="Spices">Spices</option>
                  <option value="Organic">Organic</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto bg-forest-600 hover:bg-forest-700 text-white font-semibold text-xs px-5 py-2 rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Trending Keywords */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-white/85">
              <span className="font-semibold text-white/95 hidden xs:inline">
                Quick Links:
              </span>
              {[
                { label: "Demand Forecasting", link: "/demand-forecasting" },
                { label: "Govt Cyclone News", link: "/news" },
                { label: "Urban Stores (20km)", link: "/stores" },
                { label: "Bulk Procurement", link: "/bulk" },
              ]
                .filter(
                  (item) => retailShoppingVisible || item.link !== "/stores",
                )
                .map((item) => (
                  <Link
                    key={item.label}
                    to={item.link}
                    className="bg-white/15 hover:bg-white/25 border border-white/20 px-2.5 py-0.5 rounded-full text-[10.5px] transition text-white"
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. REAL-TIME STATS COUNTER (Animated Count-Up)
        ══════════════════════════════════════════════════════════ */}
        <section className="max-w-4xl mx-auto px-3.5 -mt-8 relative z-20">
          <div className="bg-white rounded-xl shadow-md border border-gray-200/80 p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {quickStats.map((stat) => (
              <div key={stat.label} className="text-center pt-1.5 sm:pt-0">
                <p className="text-xl sm:text-2xl font-extrabold text-[#1d5f41]">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals || 0}
                    duration={2}
                  />
                </p>
                <p className="text-[10.5px] sm:text-xs font-bold text-gray-800 uppercase tracking-tight mt-0.5">
                  {stat.label}
                </p>
                <p className="text-[10px] text-gray-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. ROLE DETAILS (Swiper on Mobile / Grid on Desktop)
        ══════════════════════════════════════════════════════════ */}
        <section className="max-w-6xl mx-auto px-3.5 sm:px-6 py-10 sm:py-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1d5f41] bg-green-50 px-2.5 py-0.5 rounded border border-green-200">
                Role Portals
              </span>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1.5">
                Workspaces for Every Agricultural Stakeholder
              </h2>
            </div>
          </div>

          <div className="block lg:hidden">
            <Swiper
              modules={[Pagination, FreeMode]}
              spaceBetween={12}
              slidesPerView={1.15}
              freeMode={true}
              pagination={{ clickable: true, dynamicBullets: true }}
              breakpoints={{
                480: { slidesPerView: 1.4, spaceBetween: 14 },
                640: { slidesPerView: 2.15, spaceBetween: 16 },
                768: { slidesPerView: 2.5, spaceBetween: 16 },
              }}
              className="pb-8"
            >
              {visibleRolesData.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <SwiperSlide key={role.id} className="h-auto">
                    <div className="relative rounded-xl overflow-hidden shadow-sm border border-gray-200 h-[310px] sm:h-[340px] flex flex-col justify-between group">
                      <img
                        src={role.image}
                        alt={role.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

                      <div className="relative z-10 p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md text-[#fffa43] flex items-center justify-center border border-white/30">
                            <RoleIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="bg-white/15 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                            {role.tagline}
                          </span>
                        </div>
                      </div>

                      <div className="relative z-10 p-4 text-white flex flex-col justify-end">
                        <h3 className="text-base font-bold text-white leading-snug">
                          {role.title}
                        </h3>
                        <p className="text-[11px] text-white/80 mt-1 line-clamp-2 leading-relaxed">
                          {role.description}
                        </p>

                        <div className="mt-2 pt-2 border-t border-white/15 grid grid-cols-2 gap-1 text-[9.5px] text-white/75">
                          {role.capabilities.slice(0, 2).map((cap, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1 truncate"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#fffa43] shrink-0" />
                              <span className="truncate">{cap}</span>
                            </span>
                          ))}
                        </div>

                        <Link
                          to={role.actionLink}
                          className="mt-3 w-full bg-[#1d5f41] hover:bg-[#256d4a] text-white text-[11px] font-bold py-2 px-3 rounded-lg transition text-center shadow flex items-center justify-center gap-1 border border-white/20"
                        >
                          <span>{role.actionText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          <div className="hidden lg:grid grid-cols-3 gap-5">
            {visibleRolesData.map((role) => {
              const RoleIcon = role.icon;
              return (
                <div
                  key={role.id}
                  className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200/90 h-[340px] flex flex-col justify-between group hover:-translate-y-1"
                >
                  <img
                    src={role.image}
                    alt={role.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />

                  <div className="relative z-10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md text-[#fffa43] flex items-center justify-center border border-white/30">
                        <RoleIcon className="w-4 h-4" />
                      </div>
                      <span className="bg-white/15 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
                        {role.tagline}
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 p-5 text-white flex flex-col justify-end">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#fffa43] transition">
                      {role.title}
                    </h3>
                    <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
                      {role.description}
                    </p>

                    <div className="mt-2.5 pt-2.5 border-t border-white/15 grid grid-cols-2 gap-1 text-[10px] text-white/75">
                      {role.capabilities.slice(0, 2).map((cap, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1 truncate"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#fffa43] shrink-0" />
                          <span className="truncate">{cap}</span>
                        </span>
                      ))}
                    </div>

                    <Link
                      to={role.actionLink}
                      className="mt-3.5 w-full bg-[#1d5f41] hover:bg-[#256d4a] text-white text-xs font-bold py-2 px-3.5 rounded-xl transition text-center shadow flex items-center justify-center gap-1.5 border border-white/20"
                    >
                      <span>{role.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            5. FEATURE 1: AI DEMAND FORECASTING & PRICE OUTLOOK
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white py-10 sm:py-14 border-y border-gray-200/80">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1d5f41] bg-green-50 px-2.5 py-0.5 rounded mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#e7a52e]" />
                  <span>Market Intelligence &amp; AI Modeling</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  AI Demand Forecasting &amp; Price Outlook
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  15–30 day predictive market trends, deficit alerts, and
                  optimal harvesting windows for producers and buyers.
                </p>
              </div>

              <Link
                to="/demand-forecasting"
                className="btn-primary text-xs font-bold px-4 py-2 rounded-xl shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <span>Explore Full Forecasts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Demand Projections Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demandForecastHighlights.map((item) => {
                const isUp = item.trend === "UP";
                return (
                  <div
                    key={item.crop}
                    className="p-4 rounded-2xl border border-gray-200 bg-[#fafafc] hover:border-[#1d5f41] hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.statusColor}`}
                        >
                          {item.status}
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
                          {isUp ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {item.trendValue}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 mt-3">
                        {item.crop}
                      </h3>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400">Current</p>
                          <p className="text-xs font-semibold text-gray-700">
                            {money(item.currentPrice)}/kg
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#1d5f41] font-semibold">
                            15D Forecast
                          </p>
                          <p className="text-sm font-bold text-[#1d5f41]">
                            {money(item.projectedPrice)}/kg
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-200 text-[11px] text-gray-600 leading-snug">
                      💡 {item.advice}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            6. FEATURE 2: GOVERNMENT NEWS & IMPORTANT NOTIFICATIONS
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 sm:py-14 bg-[#f8f8fb] border-b border-gray-200/80">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1d5f41] bg-green-50 px-2.5 py-0.5 rounded mb-1.5">
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Government Notices &amp; Cyclone Warnings</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Government Advisories, MSP Circulars &amp; Videos
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Official announcements from IMD Agromet, Ministry of
                  Agriculture, and ICAR with video explainers.
                </p>
              </div>

              {/* View All Button Linking to Dedicated /news page */}
              <Link
                to="/news"
                className="bg-[#1d5f41] hover:bg-[#14432e] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
              >
                <Video className="w-3.5 h-3.5 text-red-300" />
                <span>View All News &amp; Videos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* News Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {allAgriNews.map((news) => (
                <article
                  key={news.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-[#1d5f41] hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-40 relative overflow-hidden bg-black">
                      <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      <span
                        className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-md border shadow-sm ${news.tagColor}`}
                      >
                        {news.tag}
                      </span>
                      {news.hasVideo && (
                        <span className="absolute bottom-2.5 right-2.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
                          <Play className="w-2.5 h-2.5 fill-current" /> Video
                          Guide
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                        <span className="font-semibold text-gray-700">
                          {news.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {news.date}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-[#1d5f41] transition line-clamp-2">
                        {news.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {news.summary}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-500">
                      {news.readTime}
                    </span>
                    <Link
                      to="/news"
                      className="text-xs font-bold text-[#1d5f41] hover:underline inline-flex items-center gap-1"
                    >
                      Read Full &amp; Watch Video{" "}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            7. COMMODITY CATEGORIES (Mobile Swiper / Desktop Grid)
        ══════════════════════════════════════════════════════════ */}
        {retailShoppingVisible && (
          <section className="max-w-6xl mx-auto px-3.5 sm:px-6 py-10 sm:py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  Commodity Categories
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Explore verified harvests categorized by agricultural sector.
                </p>
              </div>
              <Link
                to="/marketplace"
                className="text-xs font-semibold text-[#1d5f41] hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="block sm:hidden">
              <Swiper
                modules={[FreeMode]}
                spaceBetween={10}
                slidesPerView={1.25}
                freeMode={true}
              >
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <SwiperSlide key={cat.name} className="h-auto">
                      <Link
                        to={`/marketplace?category=${cat.name}`}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-sm flex items-start gap-3 h-full"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#1d5f41] text-white flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-xs font-bold text-gray-900">
                              {cat.name}
                            </h3>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                              {cat.count}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {cat.desc}
                          </p>
                        </div>
                      </Link>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>

            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.name}
                    to={`/marketplace?category=${cat.name}`}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-[#1d5f41] hover:shadow-md transition flex items-start gap-3.5 group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-[#1d5f41] text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#1d5f41] transition">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {cat.count}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </PageMotion>
  );
}
