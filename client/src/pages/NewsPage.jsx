import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Newspaper, Wind, Sprout, Landmark, Lightbulb, Clock, Search, ArrowUpRight, X } from "lucide-react";
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

const categories = [
  { id: "all", label: "All updates", icon: Newspaper },
  { id: "cyclone", label: "Cyclone & weather", icon: Wind },
  { id: "government", label: "Government & MSP", icon: Landmark },
  { id: "tech", label: "Agri-tech & training", icon: Lightbulb },
  { id: "crop-health", label: "Crop health", icon: Sprout },
];

function NewsImage({ src, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={"overflow-hidden bg-emerald-50 " + className}>
      {failed ? (
        <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700/50"><Newspaper className="h-16 w-16" strokeWidth={1} /></div>
      ) : (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function ArticleReader({ article, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="news-reader-title"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 sm:px-8">
          <span className="text-sm font-semibold text-emerald-800">Article reader · Sample bulletin</span>
          <button autoFocus type="button" onClick={onClose} aria-label="Close article" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-8">
          <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-semibold " + article.tagColor}>{article.categoryLabel}</span>
          <h2 id="news-reader-title" className="mt-4 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{article.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{article.date} · {article.readTime}</p>
          <p className="mt-1 text-sm text-slate-600">Listed source: {article.source}</p>
          <NewsImage src={article.image} className="mt-6 aspect-[16/8] w-full rounded-xl" />
          <p className="my-6 border-l-4 border-emerald-600 bg-emerald-50 p-4 text-base leading-relaxed text-emerald-950">{article.summary}</p>
          <div className="space-y-5 text-sm leading-7 text-slate-700 sm:text-base">
            {article.description.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
          </div>
        </div>
        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-8">
          <button type="button" onClick={onClose} className="btn-primary">Back to updates</button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

export function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticle, setActiveArticle] = useState(null);
  const query = searchQuery.trim().toLowerCase();
  const filteredArticles = newsArticles.filter((article) =>
    (selectedCategory === "all" || article.category === selectedCategory) &&
    [article.title, article.summary, article.source].some((value) => value.toLowerCase().includes(query)),
  );
  const resetFilters = () => { setSelectedCategory("all"); setSearchQuery(""); };

  return (
    <PageMotion className="min-h-screen bg-[#f5f7f5] pb-16 text-slate-900">
      <header className="border-b border-emerald-900 bg-[#14432e] px-4 py-10 text-white sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-10">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200"><Newspaper className="h-4 w-4" /> The farming bulletin</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Government news,<br className="hidden sm:block" /> advisories &amp; notifications</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-emerald-50/85 sm:text-base">Explore cyclone and weather advisories, government schemes, crop care and agricultural training in one place.</p>
          </div>
          <div aria-hidden="true" className="hidden h-36 w-36 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 lg:flex"><Sprout className="h-16 w-16 text-emerald-200" strokeWidth={1.25} /></div>
        </div>
      </header>

      <section aria-label="News and advisory feed" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><h2 className="text-lg font-bold">Find an update</h2><p className="mt-1 text-sm text-slate-500">Browse by topic or search the bulletin.</p></div>
            <div className="relative w-full sm:max-w-md">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input type="search" aria-label="Search news and advisories" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search weather, MSP, schemes…" className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-12 pr-4 text-sm placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5" role="group" aria-label="Filter by topic">
            {categories.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={selectedCategory === id} onClick={() => setSelectedCategory(id)} className={"inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm " + (selectedCategory === id ? "border-emerald-800 bg-emerald-800 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900")}>
                <Icon className="h-4 w-4 shrink-0" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-6">
          <p role="status" className="text-sm text-slate-600"><span className="font-bold text-slate-900">{filteredArticles.length} {filteredArticles.length === 1 ? "update" : "updates"}</span> {selectedCategory === "all" ? "across all topics" : "in " + categories.find((category) => category.id === selectedCategory).label.toLowerCase()}</p>
          {(selectedCategory !== "all" || searchQuery) && <button type="button" onClick={resetFilters} className="min-h-11 text-sm font-semibold text-emerald-800 underline underline-offset-4">Clear filters</button>}
          <p className="w-full text-xs leading-relaxed text-slate-500">Sample bulletin content · This page is not connected to a live government feed.</p>
        </div>

        {filteredArticles.length > 0 ? (
          <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <StaggerItem key={article.id} className="h-full min-w-0">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="relative aspect-[16/9] overflow-hidden bg-emerald-50">
                    <NewsImage src={article.image} className="h-full w-full transition-transform duration-500 motion-safe:group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className={"absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm " + article.tagColor}>{article.categoryLabel}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span>{article.date}</span><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{article.readTime}</span></div>
                    <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-slate-900">{article.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary}</p>
                    <div className="mt-auto pt-5">
                      <p className="mb-4 text-xs leading-5 text-slate-500">Listed source: {article.source}</p>
                      <button type="button" onClick={() => setActiveArticle(article)} aria-label={"Read article: " + article.title} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-800 hover:text-white">Read article<ArrowUpRight className="h-4 w-4 shrink-0" /></button>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-4 text-lg font-bold">No updates found</h3>
            <p className="mt-2 text-sm text-slate-500">Try another search or choose a different topic.</p>
            <button type="button" onClick={resetFilters} className="btn-primary mt-6">Show all updates</button>
          </div>
        )}
      </section>
      {activeArticle && <ArticleReader article={activeArticle} onClose={() => setActiveArticle(null)} />}
    </PageMotion>
  );
}
