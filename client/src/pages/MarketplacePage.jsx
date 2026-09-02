import { Filter, Search, SlidersHorizontal, X, Store, MapPin, AlertCircle, Building2, Clock, Truck, ArrowRight, ShieldAlert, Navigation } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, LoadingState, PageHeader } from "../components/UI.jsx";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { toast } from "sonner";
import { defaultFallbackStores } from "../features/stores/UrbanStoresPage.jsx";

const categories = [
  ["All", "market.catAll"],
  ["Vegetables", "market.catVegetables"],
  ["Fruits", "market.catFruits"],
  ["Grains", "market.catGrains"],
  ["Pulses", "market.catPulses"],
  ["Spices", "market.catSpices"],
  ["Organic", "market.catOrganic"],
];

const locationPresets = [
  { name: "Patia Market District, Bhubaneswar", coordinates: [85.8254, 20.3547] },
  { name: "Sahid Nagar, Bhubaneswar", coordinates: [85.8412, 20.2919] },
  { name: "Khandagiri, Bhubaneswar", coordinates: [85.7876, 20.2587] },
  { name: "Badambadi, Cuttack", coordinates: [85.8793, 20.4547] },
  { name: "Grand Road, Puri", coordinates: [85.8312, 19.8135] },
];

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const user = useAppStore((state) => state.user);

  const [selectedLocationName, setSelectedLocationName] = useState(
    user?.location || "Patia Market District, Bhubaneswar"
  );
  const [coordinates, setCoordinates] = useState(
    user?.locationCoordinates?.length === 2
      ? user.locationCoordinates
      : [85.8254, 20.3547]
  );

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

  const handleLocationSelect = (preset) => {
    setSelectedLocationName(preset.name);
    setCoordinates(preset.coordinates);
    toast.success(`Location switched to ${preset.name}`);
  };

  // Fetch urban stores using selected location
  const { data: apiStores = [], isLoading: isStoresLoading } = useQuery({
    queryKey: ["urban-stores", coordinates],
    queryFn: () =>
      getData(
        api.get("/urban-stores", {
          params: {
            longitude: coordinates[0],
            latitude: coordinates[1],
          },
        }),
      ),
  });

  const stores = apiStores.length > 0 ? apiStores : defaultFallbackStores;

  // Filter for serviceable stores within 20km
  const serviceableStores = stores.filter(
    (s) => s.status === "OPEN" && (s.distanceKm === null || s.distanceKm <= 20),
  );
  const hasUrbanStore = stores.length > 0 && serviceableStores.length > 0;
  const activeStore = serviceableStores[0] || stores[0];

  const { data = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", q, category, sort, organic, sellerId],
    queryFn: () =>
      getData(
        api.get("/products", {
          params: { q, category, sort, organic, sellerId },
        }),
      ),
    enabled: hasUrbanStore,
  });

  const isLoading = isStoresLoading || (hasUrbanStore && isProductsLoading);

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
          max="20"
          defaultValue="20"
          className="w-full accent-forest-700"
        />
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>5 km</span><span>20 km max</span>
        </div>
      </div>
    </div>
  );

  return (
    <PageMotion className="container-page py-8 sm:py-10">
      
      {/* Location Selector Bar - Centered */}
      <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center gap-3 max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="w-8 h-8 rounded-lg bg-green-50 text-[#1d5f41] flex items-center justify-center shrink-0 border border-green-200">
            <Navigation className="w-4 h-4" />
          </span>
          <div>
            <p className="text-gray-400 font-medium text-[10.5px] uppercase tracking-wide">Your Location</p>
            <p className="font-bold text-gray-900">{selectedLocationName}</p>
          </div>
        </div>

        {/* Location Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
          <span className="text-[11px] text-gray-500 mr-1 hidden sm:inline">Change Location:</span>
          {locationPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleLocationSelect(preset)}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition border ${
                selectedLocationName === preset.name
                  ? "bg-[#1d5f41] text-white border-[#1d5f41] shadow-sm"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {preset.name.split(",")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CASE 1: NO URBAN STORE WITHIN 20KM -> HIDE MARKETPLACE
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && !hasUrbanStore ? (
        <div className="max-w-3xl mx-auto my-8 bg-white rounded-3xl p-8 sm:p-12 border border-red-200 shadow-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5 border border-red-100 shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>

          <span className="badge bg-red-100 text-red-800 font-bold text-xs px-3 py-1 rounded-full mb-3">
            Service Unavailable Beyond 20km
          </span>

          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
            No Urban Store Within 20km Radius
          </h1>

          <p className="mt-3 text-sm text-gray-600 max-w-xl mx-auto leading-relaxed">
            The retail marketplace is strictly fulfilled through certified city Urban Stores within a <strong>20 km delivery radius</strong>. Currently, no active store covers {selectedLocationName}.
          </p>

          {activeStore && (
            <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-200 max-w-md mx-auto text-left flex items-start gap-3">
              <Store className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-gray-900">Nearest Outlet: {activeStore.name}</p>
                <p className="text-gray-500 mt-0.5">{activeStore.locationName} · {activeStore.distanceKm} km away (outside 20km limit)</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/stores"
              className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Store className="w-4 h-4" />
              <span>Explore All Urban Stores</span>
            </Link>

            <Link
              to="/bulk"
              className="btn-secondary text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              <span>Bulk Procurement (Wholesale)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
            CASE 2: URBAN STORE AVAILABLE -> SHOW STORE DETAILS & MARKETPLACE
        ══════════════════════════════════════════════════════════ */
        <>
          {/* Active Store Details Fulfillment Banner */}
          {activeStore && (
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#14432e] to-[#1d5f41] text-white p-5 sm:p-6 shadow-md border border-white/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md text-[#fffa43] flex items-center justify-center shrink-0 border border-white/30">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge bg-[#fffa43] text-[#14432e] text-[10.5px] font-bold">
                        Fulfilled via Urban Store
                      </span>
                      <span className="badge bg-white/15 text-white text-[10.5px]">
                        {activeStore.ownershipType === "GOVERNMENT" ? "🏛️ Government Outlet" : "🏬 Licensed Franchise"}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                      {activeStore.name}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/85 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#fffa43]" />
                        {activeStore.locationName}
                        {activeStore.distanceKm !== null
                          ? activeStore.distanceKm === 0
                            ? " (🎯 In your area · 0 km)"
                            : ` (${activeStore.distanceKm} km away · Within 20km)`
                          : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#fffa43]" />
                        Open {activeStore.hours || "06:00–22:00"} · {activeStore.estimatedDeliveryMinutes || 25} min delivery
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to="/stores"
                  className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/25 transition shrink-0 flex items-center justify-center gap-1 self-start md:self-center"
                >
                  <span>Switch Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          <PageHeader
            eyebrow={t("market.eyebrow")}
            title={t("market.title")}
            description={`Fresh farm harvests certified and fulfilled through ${activeStore?.name || "our urban store network"} within 20 km.`}
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
                  {data.map((product) => (
                    <StaggerItem key={product._id}>
                      <ProductCard product={product} />
                    </StaggerItem>
                  ))}
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
        </>
      )}
    </PageMotion>
  );
}
