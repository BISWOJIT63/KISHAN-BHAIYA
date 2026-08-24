import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Leaf,
  MapPin,
  PackageCheck,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Tractor,
  UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { LoadingState } from "../components/UI.jsx";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { canShop, workspaceForRole } from "../utils/navigation.js";

const categories = [
  ["Vegetables", "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&w=700&q=82", "center"],
  ["Fruits", "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=700&q=82", "center"],
  ["Grains", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=700&q=82", "center"],
  ["Pulses", "https://images.unsplash.com/photo-1763368403529-0b8d9108cf9c?auto=format&fit=crop&w=700&q=82", "center"],
  ["Spices", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=82", "center"],
  ["Organic", "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=82", "center"],
];

const benefits = [
  ["Better farmer income", "Transparent pricing and direct demand help producers keep more value.", Tractor],
  ["Traceable quality", "Lot-level passports make origin, grade and handling visible.", ShieldCheck],
  ["Smarter routes", "Consolidated pickups reduce empty distance and handling delay.", Route],
  ["Fresher produce", "Harvest and shelf-life details help buyers choose confidently.", Leaf],
];

const roleGuides = {
  farmer: {
    eyebrow: "Farmer workspace",
    title: "Produce, demand and fulfillment in one place.",
    steps: [
      ["01", "List produce", "Capture ready lots and expected harvests."],
      ["02", "Review demand", "Find compatible requirements from verified business buyers."],
      ["03", "Fulfil", "Manage seller orders, quotations and payments."],
    ],
  },
  fpo_manager: {
    eyebrow: "FPO workspace",
    title: "Coordinate members, lots and settlements.",
    steps: [
      ["01", "Aggregate", "Combine member contributions into fulfillable lots."],
      ["02", "Supply", "Respond to demand and manage seller orders."],
      ["03", "Settle", "Keep member settlement records transparent."],
    ],
  },
  driver: {
    eyebrow: "Driver workspace",
    title: "Keep assigned trips moving.",
    steps: [
      ["01", "Review trips", "See only the shipments assigned to you."],
      ["02", "Collect", "Record proof of pickup at the source."],
      ["03", "Deliver", "Complete the trip with proof of delivery."],
    ],
  },
  logistics: {
    eyebrow: "Logistics workspace",
    title: "Plan capacity, routes and delivery operations.",
    steps: [
      ["01", "Review shipments", "Track active pickup and delivery work."],
      ["02", "Plan routes", "Consolidate stops around vehicle capacity."],
      ["03", "Monitor delivery", "Follow operational milestones and exceptions."],
    ],
  },
  logistics_partner: {
    eyebrow: "Fleet workspace",
    title: "Plan capacity, routes and delivery operations.",
    steps: [
      ["01", "Review shipments", "Track active pickup and delivery work."],
      ["02", "Plan routes", "Consolidate stops around vehicle capacity."],
      ["03", "Monitor delivery", "Follow operational milestones and exceptions."],
    ],
  },
  admin: {
    eyebrow: "Administration",
    title: "Govern access without performing another role's work.",
    steps: [
      ["01", "Review applicants", "Check farmer, FPO, buyer and logistics verification requests."],
      ["02", "Manage trust", "Approve, reject or request changes with an audit trail."],
      ["03", "Resolve issues", "Use the administration workspace for platform oversight."],
    ],
  },
};

function StepsCard({ eyebrow, title, steps, action, to, dark = false }) {
  return (
    <article className={`card overflow-hidden p-8 sm:p-10 ${dark ? "bg-forest-900 text-white" : ""}`}>
      <p className={dark ? "text-xs font-bold uppercase tracking-widest text-forest-200" : "eyebrow"}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold">{title}</h2>
      <div className="mt-8 space-y-6">
        {steps.map(([number, step, copy]) => (
          <div className="flex gap-4" key={number}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold ${dark ? "bg-white/10 text-lime-300" : "bg-forest-50 text-forest-700"}`}>{number}</span>
            <div><h3 className="font-bold">{step}</h3><p className={`mt-1 text-sm leading-6 ${dark ? "text-forest-100/65" : "text-gray-600"}`}>{copy}</p></div>
          </div>
        ))}
      </div>
      <Link to={to} className={`mt-8 inline-flex items-center gap-2 font-bold ${dark ? "text-lime-300" : "text-forest-700"}`}>{action}<ArrowRight className="h-4 w-4" /></Link>
    </article>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const user = useAppStore((state) => state.user);
  const buyer = canShop(user?.role);
  const guest = !user;
  const guide = roleGuides[user?.role];
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => getData(api.get("/products")).then((items) => items.filter((item) => item.featured).slice(0, 8)),
    enabled: buyer,
  });
  const submit = (event) => {
    event.preventDefault();
    navigate(`/marketplace?q=${encodeURIComponent(search)}`);
  };
  const buyerSteps = [
    ["01", "Discover", "Browse fresh, nearby and traceable lots."],
    ["02", "Buy or post", "Checkout directly, or ask verified producers to quote."],
    ["03", "Receive", "Follow each pickup, hub and delivery milestone."],
  ];

  return (
    <PageMotion>
      <section className="container-page pt-5 sm:pt-8">
        <div className="hero-grid relative overflow-hidden rounded-[30px] bg-forest-950 text-white">
          <div className="absolute -right-28 -top-40 h-96 w-96 rounded-full bg-forest-500/20 blur-3xl" />
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div
              className="relative z-10 isolate bg-cover bg-[center_35%] px-6 py-12 after:pointer-events-none after:absolute after:inset-y-0 after:-right-20 after:hidden after:w-20 after:bg-gradient-to-r after:from-forest-950/60 after:to-transparent after:content-[''] sm:px-10 sm:py-16 lg:px-16 lg:py-20 lg:after:block"
              style={{
                backgroundImage: "linear-gradient(100deg, rgba(5, 46, 35, .94) 0%, rgba(5, 46, 35, .78) 68%, rgba(5, 46, 35, .58) 100%), url('https://plus.unsplash.com/premium_photo-1678344177250-bfdbed89fc03?w=1200&auto=format&fit=crop&q=82&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGZhcm1lcnxlbnwwfHwwfHx8MA%3D%3D')",
              }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-forest-100"><Sparkles className="h-4 w-4 text-lime-300" />{t("home.badge")}</div>
              <h1 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-.055em] sm:text-6xl lg:text-7xl">{t("home.headline")}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-forest-100/75 sm:text-lg">{t("home.sub")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {buyer && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#b8dd65] px-6 font-bold text-forest-950 hover:bg-[#c9e989]" to="/marketplace">{t("home.shop")}<ArrowRight className="h-4 w-4" /></Link>}
                {buyer && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 font-bold text-white hover:bg-white/15" to={user.role === "business_buyer" ? "/bulk/new" : "/orders"}>{user.role === "business_buyer" ? t("home.post") : "My orders"}</Link>}
                {guest && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#b8dd65] px-6 font-bold text-forest-950 hover:bg-[#c9e989]" to="/login">Log in<ArrowRight className="h-4 w-4" /></Link>}
                {guest && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 font-bold text-white hover:bg-white/15" to="/register">Create account</Link>}
                {!guest && !buyer && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#b8dd65] px-6 font-bold text-forest-950 hover:bg-[#c9e989]" to={workspaceForRole(user.role)}>Open my workspace<ArrowRight className="h-4 w-4" /></Link>}
                {!guest && !buyer && <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 font-bold text-white hover:bg-white/15" to="/profile">My profile</Link>}
              </div>
              {buyer && (
                <form className="mt-9 flex max-w-xl gap-2 rounded-2xl bg-white p-2 shadow-xl" onSubmit={submit}>
                  <label className="flex flex-1 items-center gap-2 px-2"><Search className="h-5 w-5 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" placeholder={t("home.placeholder")} aria-label={t("common.search")} /></label>
                  <button className="btn-primary hidden sm:inline-flex">{t("common.search")}</button>
                </form>
              )}
              <div className="mt-7 flex flex-wrap gap-5 text-xs text-forest-100/65"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" />{t("home.verified")}</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" />Role-based access</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" />{t("home.tracked")}</span></div>
            </div>
            <div className="relative min-h-[420px] overflow-hidden lg:min-h-full">
              <img className="absolute inset-0 h-full w-full object-cover brightness-[.9] saturate-[.85]" src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=88" alt="Farmer walking through a green field" />
              <div className="absolute inset-0 bg-gradient-to-r from-forest-950/80 via-forest-950/15 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3 sm:left-auto sm:w-[340px]"><div className="rounded-2xl bg-white/95 p-4 text-ink shadow-xl backdrop-blur"><p className="text-xs font-semibold text-gray-500">Produce moved this month</p><p className="mt-1 font-display text-2xl font-extrabold">128.4t</p><p className="mt-1 text-[11px] font-semibold text-forest-600">↑ 18% vs July</p></div><div className="rounded-2xl bg-[#f3c55d]/95 p-4 text-amber-950 shadow-xl"><p className="text-xs font-semibold">Surplus rescued</p><p className="mt-1 font-display text-2xl font-extrabold">4.8t</p><p className="mt-1 text-[11px] font-semibold">before expiry</p></div></div>
            </div>
          </div>
        </div>
      </section>

      {buyer && (
        <>
          <section className="container-page py-16">
            <div className="rounded-[30px] border border-forest-100 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Explore by crop</p><h2 className="section-title mt-2">What’s in season</h2><p className="mt-2 max-w-xl text-sm text-gray-500">Shop fresh categories from verified farms and producer groups.</p></div><Link to="/marketplace" className="btn-ghost">View all <ArrowRight className="h-4 w-4" /></Link></div>
              <Stagger className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {categories.map(([name, image, position]) => <StaggerItem key={name}><Link to={`/marketplace?category=${name}`} className="group relative flex min-h-40 overflow-hidden rounded-2xl bg-forest-900 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg">
                  <img className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" style={{ objectPosition: position }} src={image} alt={`${name} produce`} loading="lazy" />
                  <span className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/15 to-white/5" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white"><strong className="font-display text-base">{name}</strong><ArrowRight className="h-4 w-4 translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" /></span>
                </Link></StaggerItem>)}
              </Stagger>
            </div>
          </section>
          <section className="container-page pb-16">
            <div className="mb-7 flex items-end justify-between"><div><p className="eyebrow">Fresh near you</p><h2 className="section-title mt-2">Harvested close to home</h2><p className="mt-2 text-sm text-gray-500"><MapPin className="mr-1 inline h-4 w-4" />Available around your selected location</p></div><Link className="btn-secondary hidden sm:inline-flex" to="/marketplace">Browse marketplace</Link></div>
            {isLoading ? <LoadingState /> : <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <StaggerItem key={product._id}><ProductCard product={product} /></StaggerItem>)}</Stagger>}
          </section>
          <section className="bg-white py-16">
            <div className="container-page"><div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Why buy direct?</p><h2 className="section-title mt-2">Better commerce, from field to fork</h2><p className="mt-4 leading-7 text-gray-600">Every workflow is designed around trust, fewer avoidable handoffs, and clear operational decisions.</p></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{benefits.map(([title, copy, Icon]) => <article key={title} className="rounded-[20px] border border-gray-100 bg-cream p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-100 text-forest-800"><Icon className="h-5 w-5" /></span><h3 className="mt-5 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{copy}</p></article>)}</div></div>
          </section>
        </>
      )}

      <section id="how-it-works" className="container-page py-16">
        <div className={`grid gap-6 ${guest ? "lg:grid-cols-2" : "mx-auto max-w-3xl"}`}>
          {(buyer || guest) && <StepsCard eyebrow="For buyers" title="Fresh shopping or structured procurement." steps={buyerSteps} action={buyer ? (user.role === "business_buyer" ? "Open procurement" : "Browse marketplace") : "Create a buyer account"} to={buyer ? (user.role === "business_buyer" ? "/bulk" : "/marketplace") : "/register"} dark />}
          {guest && <StepsCard eyebrow="For farmers & FPOs" title="Sell with demand in view." steps={roleGuides.farmer.steps} action="Create a producer account" to="/register" />}
          {guide && <StepsCard eyebrow={guide.eyebrow} title={guide.title} steps={guide.steps} action="Open my workspace" to={workspaceForRole(user.role)} />}
        </div>
      </section>

      <section className="container-page pb-10">
        <div className="card overflow-hidden bg-[#f2c75c] p-8 sm:p-10"><div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-2 text-sm font-bold text-amber-950"><UsersRound className="h-5 w-5" />Built around real agricultural trade</div><blockquote className="mt-4 max-w-4xl font-display text-2xl font-bold leading-snug text-amber-950 sm:text-3xl">“The demand view helps us plan what to aggregate before harvest day. Our buyer sees one order; our members still get a transparent settlement.”</blockquote><p className="mt-4 text-sm font-semibold text-amber-900">Madhabi Sethi · Utkal Harvest FPO · Demo testimonial</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/55 p-4"><BarChart3 className="h-5 w-5" /><p className="mt-3 font-display text-2xl font-extrabold">96%</p><p className="text-xs font-semibold">fill rate</p></div><div className="rounded-2xl bg-white/55 p-4"><PackageCheck className="h-5 w-5" /><p className="mt-3 font-display text-2xl font-extrabold">487</p><p className="text-xs font-semibold">orders</p></div></div></div></div>
      </section>
    </PageMotion>
  );
}
