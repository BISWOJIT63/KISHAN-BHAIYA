import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, LoadingState, PageHeader } from "../components/UI.jsx";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";

const categories = [
  ["All", "market.catAll"],
  ["Vegetables", "market.catVegetables"],
  ["Fruits", "market.catFruits"],
  ["Grains", "market.catGrains"],
  ["Pulses", "market.catPulses"],
  ["Spices", "market.catSpices"],
  ["Organic", "market.catOrganic"],
];

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const q = params.get("q") || "";
  const category = params.get("category") || "All";
  const sort = params.get("sort") || "recommended";
  const organic = params.get("organic") || "";
  const sellerId = params.get("sellerId") || "";
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const { data = [], isLoading } = useQuery({
    queryKey: ["products", q, category, sort, organic, sellerId],
    queryFn: () =>
      getData(
        api.get("/products", {
          params: { q, category, sort, organic, sellerId },
        }),
      ),
  });
  const filters = (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">{t("common.filters")}</h3>
        <button
          className="text-xs font-bold text-forest-700"
          onClick={() => setParams({})}
        >
          {t("common.clear")}
        </button>
      </div>
      <label className="label">{t("market.category")}</label>
      <div className="space-y-1">
        {categories.map(([value, label]) => (
          <button
            key={value}
            onClick={() => set("category", value === "All" ? "" : value)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold ${category === value ? "bg-forest-900 text-white" : "text-gray-600 hover:bg-forest-50"}`}
          >
            <span>{t(label)}</span>
            {category === value && <span>✓</span>}
          </button>
        ))}
      </div>
      <div className="mt-7 border-t pt-5">
        <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-700">
          {t("market.organicOnly")}
          <input
            type="checkbox"
            className="h-4 w-4 accent-forest-700"
            checked={organic === "true"}
            onChange={(event) =>
              set("organic", event.target.checked ? "true" : "")
            }
          />
        </label>
      </div>
      <div className="mt-7 border-t pt-5">
        <label className="label">{t("market.distance")}</label>
        <input
          type="range"
          min="5"
          max="200"
          defaultValue="75"
          className="w-full accent-forest-700"
        />
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>5 km</span><span>200 km</span>
        </div>
      </div>
      <div className="mt-7 border-t pt-5">
        <label className="label">{t("market.grade")}</label>
        {["Premium", "Grade A", "Grade B"].map((grade) => (
          <label key={grade} className="mb-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="accent-forest-700" /> {grade}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <PageMotion className="container-page py-10">
      <PageHeader
        eyebrow={t("market.eyebrow")}
        title={t("market.title")}
        description={t("market.description")}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="card flex h-12 flex-1 items-center gap-3 px-4 shadow-none">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            className="min-w-0 p-3 flex-1 bg-transparent text-sm outline-none"
            value={q}
            onChange={(event) => set("q", event.target.value)}
            placeholder={t("market.placeholder")}
          />
        </label>
        <select
          className="input w-full sm:w-56"
          value={sort}
          onChange={(event) => set("sort", event.target.value)}
        >
          <option value="recommended">{t("market.recommended")}</option>
          <option value="price_asc">{t("market.priceLow")}</option>
          <option value="price_desc">{t("market.priceHigh")}</option>
          <option value="freshest">{t("market.freshest")}</option>
          <option value="rating">{t("market.rating")}</option>
        </select>
        <button className="btn-secondary lg:hidden" onClick={() => setDrawer(true)}>
          <SlidersHorizontal className="h-4 w-4" /> {t("common.filters")}
        </button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="card sticky top-24 hidden p-5 lg:block">{filters}</aside>
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              {t("market.available", { count: data.length })}
            </p>
            <span className="badge hidden bg-forest-50 text-forest-700 sm:inline-flex">
              <Filter className="h-3 w-3" /> {t("market.updated")}
            </span>
          </div>
          {isLoading ? (
            <LoadingState />
          ) : data.length ? (
            <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((product) => <StaggerItem key={product._id}><ProductCard product={product} /></StaggerItem>)}
            </Stagger>
          ) : (
            <EmptyState title={t("market.empty")} description={t("market.emptyHelp")} />
          )}
        </div>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-[90] bg-ink/40" onClick={() => setDrawer(false)}>
          <aside
            className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-auto rounded-t-3xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="absolute right-5 top-5" onClick={() => setDrawer(false)}>
              <X />
            </button>
            {filters}
          </aside>
        </div>
      )}
    </PageMotion>
  );
}
