import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  Wind,
  Sparkles,
  ShieldCheck,
  Play,
  Clock,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Volume2,
  Video,
  Share2,
  X,
} from "lucide-react";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";

// Exported for homepage/news reuse; the remainder of this file is the page.
// eslint-disable-next-line react-refresh/only-export-components
export const newsArticles = [
  {
    id: "news-cyclone-1",
    category: "cyclone",
    categoryLabel: "Cyclone & Weather Alert",
    tagColor: "bg-red-100 text-red-800 border-red-200",
    badge: "CRITICAL ADVISORY",
    title: "IMD Cyclone Alert: Deep Depression in Bay of Bengal — Coastal Harvesting & Safety Protocol",
    summary: "Comprehensive emergency advisory for farmers in coastal Odisha, Andhra Pradesh, and West Bengal to expedite harvesting of mature paddy and horticultural crops before severe rainfall.",
    description: `The India Meteorological Department (IMD) Agromet Advisory Division has issued an urgent cyclonic weather bulletin for the eastern seaboard. A deep depression over the west-central Bay of Bengal is expected to intensify into a cyclonic storm, bringing heavy to very heavy precipitation and wind speeds of 65–85 km/h across coastal districts over the next 72 to 96 hours.

Key Instructions for Farmers:
1. Immediately harvest all 80%+ mature paddy crops, tomato lots, and leafy greens to minimize field lodging and rotting.
2. Shift harvested produce to elevated FPO aggregation warehouses and government cold-storage buffer depots immediately.
3. Open drainage channels across vegetable furrows to prevent water stagnation and root rot.
4. Secure polyhouses and shade nets with heavy tie-downs.`,
    date: "Sep 01, 2026",
    source: "IMD Agromet Advisory & Ministry of Agriculture",
    image: "https://images.unsplash.com/photo-1514632595-4944383fa27c?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Educational placeholder video
    videoTitle: "Emergency Cyclone Safety & Field Drainage Measures for Farmers",
    readTime: "4 min read",
    isImportant: true,
  },
  {
    id: "news-msp-2",
    category: "government",
    categoryLabel: "Government Scheme & MSP",
    tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    badge: "GOVT NOTIFICATION",
    title: "Cabinet Approves Kharif 2026 MSP Rates: Significant Increase for Pulses, Millets & Oilseeds",
    summary: "Minimum Support Prices (MSP) hiked up to 8.2% to ensure 50%+ profit margin over cost of production for Indian farming families.",
    description: `The Cabinet Committee on Economic Affairs (CCEA) has officially approved the Minimum Support Prices (MSP) for all mandated Kharif crops for marketing season 2026–27.

Highlights of the New Rates:
- Arhar / Tur: ₹7,550 per quintal (increase of ₹550/qtl)
- Moong: ₹8,682 per quintal
- Urad: ₹7,400 per quintal
- Ragi & Bajra: Substantial boost to promote nutritious Shree Anna millet cultivation.

Direct Benefit Transfer (DBT) integration has been linked directly with registered Kisan Bhaiya FPO wallets, allowing verified producers to receive automatic bank clearances within 48 hours of lot delivery.`,
    date: "Aug 31, 2026",
    source: "Press Information Bureau (PIB) / Agri Ministry",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    videoTitle: "MSP 2026 Rate Chart & Direct Bank Transfer Guide",
    readTime: "3 min read",
    isImportant: true,
  },
  {
    id: "news-tech-3",
    category: "tech",
    categoryLabel: "Agri-Tech & Training",
    tagColor: "bg-blue-100 text-blue-800 border-blue-200",
    badge: "INNOVATION & TRAINING",
    title: "Deployment of 5MT Decentralized Solar Cold Rooms Across 45 Rural Farming Hubs",
    summary: "Off-grid micro cold storage units empower smallholder farmers to store perishable tomatoes and leafy vegetables for up to 21 days with zero electricity bills.",
    description: `To eliminate distress selling and post-harvest produce degradation, the National Horticulture Board in partnership with state agricultural departments has commissioned 45 decentralized solar-powered cold rooms.

Features of the Micro-Units:
- 5 Metric Tonne holding capacity equipped with thermal energy storage (TES).
- Maintains constant 4°C to 10°C temperature and 85–90% relative humidity.
- Prevents post-harvest weight loss and extends tomato shelf life from 3 days to 21 days.
- Integrated with the Kisan Bhaiya logistics route planner for automated driver pickup when lots are ready for dispatch.`,
    date: "Aug 30, 2026",
    source: "ICAR Agricultural Technology Desk",
    image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    videoTitle: "How Decentralized Solar Cold Rooms Work — Farm Demo",
    readTime: "5 min read",
    isImportant: false,
  },
  {
    id: "news-subsidy-4",
    category: "government",
    categoryLabel: "Government Scheme & MSP",
    tagColor: "bg-purple-100 text-purple-800 border-purple-200",
    badge: "SUBSIDY PORTAL",
    title: "National Drip Irrigation & Micro-Sprinkler 70% Subsidy Scheme Window Open for Smallholders",
    summary: "Under the Pradhan Mantri Krishi Sinchayee Yojana (PMKSY), small and marginal farmers can claim up to 70% direct subsidy for installing precision micro-irrigation systems.",
    description: `Applications are now active on the national portal for the PMKSY 'Per Drop More Crop' subsidy initiative. Precision drip systems reduce water usage by 45% while boosting vegetable yields by up to 35%.

Eligibility:
- All individual farmers with landholdings up to 5 acres are eligible for 70% subsidy assistance.
- FPO clusters can apply for community micro-irrigation projects with centralized fertigation tanks.
- Registered users can verify Aadhaar-linked land records directly through their Kisan Bhaiya dashboard.`,
    date: "Aug 29, 2026",
    source: "Department of Water Resources & Agriculture",
    image: "https://images.unsplash.com/photo-1589923188651-268a9765e432?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    videoTitle: "Step-by-Step PMKSY Drip Irrigation Subsidy Application Process",
    readTime: "4 min read",
    isImportant: false,
  },
  {
    id: "news-crop-5",
    category: "crop-health",
    categoryLabel: "Crop Health & Weather",
    tagColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    badge: "BIOLOGICAL ADVISORY",
    title: "Organic Bio-Pest Management Guidelines for Late Kharif Vegetables Amid Continuous Rains",
    summary: "State Agricultural University scientists release non-chemical pest defense strategies against fruit borers, leaf curl, and fungal downy mildew.",
    description: `Prolonged moisture in soil and air during late monsoon creates favorable conditions for fungal blight and caterpillar infestations in brinjal, chilli, and tomato crops.

Recommended Natural Remedies:
1. Spray 5% Neem Seed Kernel Extract (NSKE) or 10,000 PPM Neem Oil early morning to deter egg laying.
2. Apply Trichoderma viride bio-fungicide (5g/litre of water) near root zones to prevent root rot.
3. Erect yellow and blue sticky traps (15 traps per acre) for flying whiteflies and thrips.`,
    date: "Aug 28, 2026",
    source: "State Agricultural University Entomological Wing",
    image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    videoTitle: "Organic Bio-Pesticide Preparation and Spraying Demonstration",
    readTime: "3 min read",
    isImportant: false,
  },
  {
    id: "news-success-6",
    category: "tech",
    categoryLabel: "Agri-Tech & Training",
    tagColor: "bg-amber-100 text-amber-800 border-amber-200",
    badge: "CASE STUDY",
    title: "Koraput Tribal Women-Led Spices FPO Achieves Direct B2B Contracting with Urban Retailers",
    summary: "420 tribal women farmers bypass middlemen by leveraging digital quality passports and QR-coded lot certificates for premium GI-tagged turmeric.",
    description: `A collective of 420 smallholder women farmers in the Koraput valley of Odisha has completed direct commercial supply contracts worth ₹1.85 Crore with major supermarket chains across Bhubaneswar and Kolkata.

Key Success Drivers:
- Standardized organic grading with zero pesticide residues certified via digital quality passports.
- High curcumin content (5.8%+) tested in NABL-accredited mobile quality labs.
- Direct digital contracting guaranteed 100% price realization at ₹180/kg compared to ₹90/kg offered by traditional traders.`,
    date: "Aug 27, 2026",
    source: "Odisha Livelihood Mission (OLM)",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=1000&q=80",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    videoTitle: "Empowering Women Farmers: The Koraput Turmeric Success Story",
    readTime: "4 min read",
    isImportant: false,
  },
];

export function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideoArticle, setActiveVideoArticle] = useState(null);
  const [activeDetailArticle, setActiveDetailArticle] = useState(null);

  const filteredArticles = newsArticles.filter((article) => {
    const matchesCategory =
      selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <PageMotion className="bg-[#f4f4f8] text-[#17221d] min-h-screen pb-16 font-sans">
      
      {/* Top Banner Header - Centered */}
      <section className="bg-[#14432e] text-white pt-10 pb-16 px-4 sm:px-6 relative overflow-hidden text-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="badge bg-red-600 text-white font-bold text-xs uppercase px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5" />
              Live Government Bulletin
            </span>
            <span className="badge bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20">
              IMD · Ministry of Agriculture · ICAR
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Government News, Cyclone Advisories &amp; Notifications
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/85 max-w-2xl leading-relaxed mx-auto">
            Stay updated with authoritative agricultural notifications, cyclone warnings, Kharif MSP rate charts, government subsidy schemes, and instructional field training videos.
          </p>

          {/* Search & Filter Controls - Centered */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search advisories, cyclone alerts, MSP schemes, or subsidies..."
                className="w-full bg-white text-gray-900 pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none border border-gray-200 shadow-sm placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 w-full sm:w-auto">
              {[
                { id: "all", label: "All Updates" },
                { id: "cyclone", label: "🌪️ Cyclone & Weather" },
                { id: "government", label: "🏛️ Govt & MSP" },
                { id: "tech", label: "💡 Agri-Tech & Training" },
                { id: "crop-health", label: "🌱 Crop Health" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`text-xs px-3 py-2 rounded-xl font-bold transition border ${
                    selectedCategory === tab.id
                      ? "bg-[#fffa43] text-[#14432e] border-[#fffa43] shadow"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Feed */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        
        {/* Results Counter */}
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-200/80 mb-6">
          <p className="text-xs sm:text-sm font-semibold text-gray-700">
            Showing <span className="text-[#1d5f41] font-bold">{filteredArticles.length}</span> official notifications &amp; advisories
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Video className="w-4 h-4 text-red-600" />
            <span>Click any article to watch full video &amp; details</span>
          </div>
        </div>

        {/* Articles Grid */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <StaggerItem key={article.id}>
              <article className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                <div>
                  {/* Thumbnail with Video Play Overlay */}
                  <div className="relative h-48 overflow-hidden bg-black">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Category Badge */}
                    <span
                      className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-md border shadow-sm ${article.tagColor}`}
                    >
                      {article.categoryLabel}
                    </span>

                    {/* Video Play Button Overlay */}
                    <button
                      type="button"
                      onClick={() => setActiveVideoArticle(article)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition backdrop-blur-sm"
                      aria-label="Play educational video"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </button>

                    <span className="absolute bottom-3 left-3 text-[10.5px] font-bold text-white flex items-center gap-1.5 drop-shadow">
                      <Video className="w-3.5 h-3.5 text-red-400" />
                      <span>Watch Advisory Video</span>
                    </span>
                  </div>

                  {/* Article Text */}
                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                      <span className="font-bold text-gray-700 truncate max-w-[180px]">
                        {article.source}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {article.date}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-gray-900 leading-snug group-hover:text-[#1d5f41] transition line-clamp-2">
                      {article.title}
                    </h2>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-5 pt-0">
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveVideoArticle(article)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Video Demo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailArticle(article)}
                      className="bg-[#1d5f41] hover:bg-[#14432e] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1"
                    >
                      <span>Full Advisory</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

      </main>

      {/* ══════════════════════════════════════════════════════════
          VIDEO MODAL PLAYER
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeVideoArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl border border-gray-200"
            >
              <div className="bg-[#14432e] p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-sm sm:text-base truncate">
                    {activeVideoArticle.videoTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveVideoArticle(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player Box */}
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`${activeVideoArticle.videoUrl}?autoplay=1`}
                  title={activeVideoArticle.videoTitle}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-5 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-gray-900">{activeVideoArticle.title}</p>
                  <p className="text-gray-500 mt-0.5">Source: {activeVideoArticle.source} · {activeVideoArticle.date}</p>
                </div>
                <button
                  onClick={() => {
                    const article = activeVideoArticle;
                    setActiveVideoArticle(null);
                    setActiveDetailArticle(article);
                  }}
                  className="bg-[#1d5f41] text-white px-4 py-2 rounded-lg font-bold shrink-0 hover:bg-[#14432e] transition"
                >
                  Read Full Circular
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          ARTICLE DETAIL MODAL WITH FULL TEXT & ATTACHMENTS
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeDetailArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl border border-gray-200 my-8"
            >
              {/* Header */}
              <div className="bg-[#14432e] p-5 text-white flex items-start justify-between">
                <div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${activeDetailArticle.tagColor}`}>
                    {activeDetailArticle.categoryLabel}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg mt-2 leading-snug">
                    {activeDetailArticle.title}
                  </h3>
                  <p className="text-xs text-white/80 mt-1">
                    {activeDetailArticle.source} · {activeDetailArticle.date}
                  </p>
                </div>
                <button
                  onClick={() => setActiveDetailArticle(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-white shrink-0 ml-3"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <img
                  src={activeDetailArticle.image}
                  alt={activeDetailArticle.title}
                  className="w-full h-52 object-cover rounded-xl border border-gray-200"
                />

                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-xs text-green-900 leading-relaxed font-medium">
                  <strong>Summary:</strong> {activeDetailArticle.summary}
                </div>

                <div className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line space-y-2">
                  {activeDetailArticle.description}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    const article = activeDetailArticle;
                    setActiveDetailArticle(null);
                    setActiveVideoArticle(article);
                  }}
                  className="text-red-600 font-bold hover:underline flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Watch Explainer Video</span>
                </button>

                <button
                  onClick={() => setActiveDetailArticle(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

    </PageMotion>
  );
}
