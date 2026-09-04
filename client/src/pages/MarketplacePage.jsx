import {
  LayoutGrid,
  Carrot,
  Apple,
  Wheat,
  Boxes,
  Flame,
  Leaf,
  Sprout,
  Store,
  MapPin,
  AlertCircle,
  Clock,
  Truck,
  ArrowRight,
  ShieldAlert,
  Navigation,
  Zap,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  Building2,
  Star,
  TrendingDown,
  BadgeCheck,
  LocateFixed,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, LoadingState, PageHeader } from "../components/UI.jsx";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { detectCurrentIndiaLocation } from "../utils/location.js";
import { defaultFallbackStores } from "../features/stores/UrbanStoresPage.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { money } from "../utils/format.js";

const categoriesWithIcons = [
  { key: "All", label: "All Harvests", icon: LayoutGrid, color: "text-forest-700", bg: "bg-forest-50" },
  { key: "Vegetables", label: "Fresh Vegetables", icon: Carrot, color: "text-orange-600", bg: "bg-orange-50" },
  { key: "Fruits", label: "Farm Fruits", icon: Apple, color: "text-red-500", bg: "bg-red-50" },
  { key: "Grains", label: "Grains & Atta", icon: Wheat, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "Pulses", label: "Pulses & Dals", icon: Boxes, color: "text-emerald-700", bg: "bg-emerald-50" },
  { key: "Spices", label: "Farm Spices", icon: Flame, color: "text-rose-600", bg: "bg-rose-50" },
  { key: "Organic", label: "Certified Organic", icon: Leaf, color: "text-green-600", bg: "bg-green-50" },
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { cart } = useAppStore();

  const [storeModal, setStoreModal] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState("Detecting nearby stores…");
  const [coordinates, setCoordinates] = useState([85.8254, 20.3547]);
  const [locationError, setLocationError] = useState("");
  const [locationRequest, setLocationRequest] = useState(0);
  const [isLocating, setIsLocating] = useState(false);

  const q = params.get("q") || "";
  const category = params.get("category") || "All";
  const sort = params.get("sort") || "recommended";
  const organic = params.get("organic") || "";
  const storeIdParam = params.get("storeId") || "";

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== "All") next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  // Location detection
  useEffect(() => {
    let active = true;
    setIsLocating(true);
    setLocationError("");
    detectCurrentIndiaLocation()
      .then((detected) => {
        if (!active) return;
        setCoordinates(detected.coordinates || [detected.longitude, detected.latitude]);
        setSelectedLocationName(detected.label || detected.name || "Current GPS location");
      })
      .catch((error) => {
        if (!active) return;
        setLocationError(error.message || "GPS detection was not available. Showing Bhubaneswar stores.");
      })
      .finally(() => {
        if (active) setIsLocating(false);
      });
    return () => {
      active = false;
    };
  }, [locationRequest]);

  // Fetch urban stores using coordinates
  const { data: apiStores = [], isLoading: isStoresLoading } = useQuery({
    queryKey: ["urban-stores", coordinates?.[0], coordinates?.[1]],
    queryFn: () =>
      getData(
        api.get("/urban-stores", {
          params: {
            longitude: coordinates[0],
            latitude: coordinates[1],
          },
        }),
      ),
    enabled: Array.isArray(coordinates) && coordinates.length === 2,
  });

  const stores = apiStores.length > 0 ? apiStores : defaultFallbackStores;

  // Filter serviceable stores (within 20km)
  const serviceableStores = stores.filter(
    (s) => s.status === "OPEN" && (s.distanceKm === null || s.distanceKm <= 20),
  );
  const hasUrbanStore = stores.length > 0 && serviceableStores.length > 0;

  // Determine active store
  const activeStore = useMemo(() => {
    if (storeIdParam) {
      const match = stores.find((s) => s._id === storeIdParam);
      if (match) return match;
    }
    return serviceableStores[0] || stores[0];
  }, [storeIdParam, stores, serviceableStores]);

  // Fetch catalog products from API as supplemental data
  const { data: catalogProducts = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getData(api.get("/products")),
  });

  // Combine and format store inventory into Blinkit farming products
  const storeProducts = useMemo(() => {
    if (!activeStore) return [];

    const inventoryList = activeStore.inventory || [];
    const catalogMap = new Map(catalogProducts.map((p) => [p._id, p]));

    let items = inventoryList.map((inv) => {
      const productDetail = inv.product || catalogMap.get(inv.productId) || {};
      return {
        ...productDetail,
        _id: inv.productId || productDetail._id || inv._id,
        name: productDetail.name || inv.productId,
        category: productDetail.category || "Vegetables",
        unit: productDetail.unit || "kg",
        image: productDetail.image,
        organic: productDetail.organic || false,
        grade: productDetail.grade || "A",
        rating: productDetail.rating || 4.8,
        retailPrice: Number(inv.price),
        marketPrice: Number(inv.marketPrice || inv.price * 1.15),
        availableQuantity: Number(inv.stock),
        storeInventoryId: inv._id,
        quantityStep: Number(inv.quantityStep || inv.minimumQuantity || 0.25),
        minimumQuantity: Number(inv.minimumQuantity || 0.25),
      };
    });

    // Apply category filter
    if (category && category !== "All") {
      if (category === "Organic") {
        items = items.filter((item) => item.organic);
      } else {
        items = items.filter(
          (item) => item.category?.toLowerCase() === category.toLowerCase(),
        );
      }
    }

    // Apply organic filter checkbox
    if (organic === "true") {
      items = items.filter((item) => item.organic);
    }

    // Apply live search query
    if (q.trim()) {
      const term = q.toLowerCase();
      items = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(term) ||
          item.category?.toLowerCase().includes(term),
      );
    }

    // Apply sorting
    if (sort === "price_asc") {
      items.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (sort === "price_desc") {
      items.sort((a, b) => b.retailPrice - a.retailPrice);
    } else if (sort === "rating") {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return items;
  }, [activeStore, catalogProducts, category, organic, q, sort]);

  // Cart summary for Blinkit floating bottom bar
  const cartForActiveStore = useMemo(
    () => cart.filter((item) => !item.storeId || (activeStore && item.storeId === activeStore._id)),
    [cart, activeStore],
  );

  const cartCount = cartForActiveStore.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const cartSubtotal = cartForActiveStore.reduce(
    (acc, item) => acc + Number(item.price || item.retailPrice || 0) * (Number(item.quantity) || 1),
    0,
  );
  const cartSavings = cartForActiveStore.reduce(
    (acc, item) =>
      acc +
      Math.max(0, Number(item.marketPrice || item.price * 1.15) - Number(item.price)) *
        (Number(item.quantity) || 1),
    0,
  );

  const handleSelectStore = (storeObj) => {
    set("storeId", storeObj._id);
    setStoreModal(false);
  };

  const handleSelectPreset = (preset) => {
    setSelectedLocationName(preset.name);
    setCoordinates(preset.coordinates);
    setLocationError("");
    setStoreModal(false);
  };

  const isLoading = isLocating || isStoresLoading;

  return (
    <PageMotion className="container-page pb-28 pt-4 sm:pt-6">
      {/* ══════════════════════════════════════════════════════════
          1. BLINKIT-STYLE TOP QUICK COMMERCE BAR & STORE SWITCHER
      ══════════════════════════════════════════════════════════ */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#14432e] via-[#1d5f41] to-[#14432e] p-3.5 sm:p-5 text-white shadow-md border border-white/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Left: ETA + Delivery Location */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fffa43] text-[#14432e] shadow-sm font-black text-xs">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#fffa43] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#14432e]">
                  <Zap className="h-3 w-3 fill-current" />
                  <span>{activeStore?.estimatedDeliveryMinutes || 15} MINS</span>
                </span>
                <span className="text-[11px] font-bold text-white/80 hidden sm:inline">
                  Fresh Farm-to-Door Delivery
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/90">
                <MapPin className="h-3.5 w-3.5 text-[#fffa43] shrink-0" />
                <span className="truncate font-semibold max-w-[280px] sm:max-w-md">
                  {selectedLocationName}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Active Store Info + Switch Store Button */}
          {activeStore && (
            <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-white/10 pt-2.5 md:border-t-0 md:pt-0">
              <div className="text-left md:text-right">
                <p className="truncate text-xs font-bold text-white flex items-center md:justify-end gap-1.5">
                  <Store className="h-3.5 w-3.5 text-[#fffa43]" />
                  <span>{activeStore.name}</span>
                </p>
                <div className="flex items-center md:justify-end gap-2 text-[11px] text-white/75 mt-0.5">
                  <span className="inline-flex items-center gap-1">
                    {activeStore.ownershipType === "GOVERNMENT" ? (
                      <>
                        <Building2 className="h-3 w-3 text-lime-300" />
                        <span>Government Kendra</span>
                      </>
                    ) : (
                      <>
                        <Store className="h-3 w-3 text-amber-300" />
                        <span>Licensed Franchise</span>
                      </>
                    )}
                  </span>
                  {activeStore.distanceKm !== null && (
                    <span>· {activeStore.distanceKm} km away</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStoreModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition border border-white/25 shrink-0"
              >
                <span>Switch Store</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. STORE PICKER & LOCATION SWITCHER MODAL
      ══════════════════════════════════════════════════════════ */}
      {storeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setStoreModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-gray-900">
                  Select Fulfilment Store
                </h3>
                <p className="text-xs text-gray-500">
                  Choose a certified urban kisan store within the 20km delivery radius
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStoreModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Area Presets */}
            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Quick Select Delivery Area
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {locationPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-[#1d5f41] hover:text-white hover:border-[#1d5f41] transition"
                  >
                    {preset.name.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Nearest Detected Stores List */}
            <div className="mt-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Nearby Urban Stores ({stores.length})
              </label>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {stores.map((s) => {
                  const isCur = activeStore?._id === s._id;
                  const isDeliv = s.distanceKm === null || s.distanceKm <= 20;
                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => handleSelectStore(s)}
                      className={`w-full rounded-2xl border p-3 text-left transition flex items-center justify-between gap-3 ${
                        isCur
                          ? "border-[#1d5f41] bg-green-50/70 ring-2 ring-[#1d5f41]/20"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {s.name}
                          </p>
                          {isCur && (
                            <span className="badge bg-[#1d5f41] text-white text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          {s.locationName}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-600 font-medium">
                          <span className={`inline-flex items-center gap-1 ${isDeliv ? "text-green-700 font-bold" : "text-red-600 font-bold"}`}>
                            <MapPin className="h-3 w-3" />
                            <span>{s.distanceKm !== null ? `${s.distanceKm} km away` : "Nearby"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span>{s.estimatedDeliveryMinutes || 15} mins</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span>{s.rating || "4.8"}</span>
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex gap-2 border-t pt-3">
              <button
                type="button"
                className="btn-secondary flex-1 text-xs"
                onClick={() => setLocationRequest((v) => v + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh GPS</span>
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-xs"
                onClick={() => {
                  setStoreModal(false);
                  navigate("/stores");
                }}
              >
                <Store className="h-3.5 w-3.5" />
                <span>All Stores Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. OUT OF SERVICE RADIUS ALERT
      ══════════════════════════════════════════════════════════ */}
      {!isLoading && !hasUrbanStore ? (
        <div className="mx-auto my-8 max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-black text-gray-900">
            No Open Urban Store Within 20km
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            The direct farm produce marketplace is delivered via our certified city urban stores within a <strong>20 km delivery radius</strong>.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={() => setStoreModal(true)}
            >
              <MapPin className="h-4 w-4" />
              <span>Choose Delivery Location</span>
            </button>
            <Link to="/bulk" className="btn-secondary text-xs">
              <span>Bulk Procurement (Wholesale)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════
              4. BLINKIT CATEGORY RAIL (USING LUCIDE REACT ICONS)
          ══════════════════════════════════════════════════════════ */}
          <div className="mb-5 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-2 min-w-max">
              {categoriesWithIcons.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = category === cat.key || (cat.key === "All" && (!category || category === "All"));
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => set("category", cat.key === "All" ? "" : cat.key)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition shadow-sm border ${
                      isActive
                        ? "bg-[#1d5f41] text-white border-[#1d5f41] shadow-md scale-105"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 ${isActive ? "text-white" : cat.color}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              5. SEARCH, SORT & FILTERS BAR
          ══════════════════════════════════════════════════════════ */}
          <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => set("q", e.target.value)}
                placeholder='Search farm vegetables, fruits, grains, pulses...'
                className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium outline-none focus:border-[#1d5f41] focus:ring-2 focus:ring-[#1d5f41]/20 shadow-sm"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => set("q", "")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sort}
                onChange={(e) => set("sort", e.target.value)}
                className="h-10 rounded-2xl border border-gray-200 bg-white px-3 text-xs sm:text-sm font-bold text-gray-700 outline-none focus:border-[#1d5f41] shadow-sm flex-1 sm:flex-initial"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>

              {/* Organic Toggle Chip */}
              <button
                type="button"
                onClick={() => set("organic", organic === "true" ? "" : "true")}
                className={`flex h-10 items-center gap-1.5 rounded-2xl px-3.5 text-xs font-bold transition border shadow-sm ${
                  organic === "true"
                    ? "bg-lime-500 text-forest-950 border-lime-500"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Leaf className="h-3.5 w-3.5 text-green-700" />
                <span>Organic</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              6. BLINKIT PRODUCT GRID
          ══════════════════════════════════════════════════════════ */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-[#1d5f41]" />
                <span>
                  Showing {storeProducts.length} farm items from{" "}
                  <strong className="text-[#1d5f41]">{activeStore?.name}</strong>
                </span>
              </p>
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Certified Farm-Gate Produce
              </span>
            </div>

            {isLoading ? (
              <LoadingState />
            ) : storeProducts.length > 0 ? (
              <Stagger className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {storeProducts.map((product) => (
                  <StaggerItem key={product.storeInventoryId || product._id}>
                    <ProductCard
                      product={product}
                      fulfillmentStore={activeStore}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <EmptyState
                  title="No farm produce found"
                  description="Try changing your search query or selecting another crop category."
                />
                {(q || category !== "All" || organic) && (
                  <button
                    type="button"
                    onClick={() => setParams({})}
                    className="btn-primary mt-4 text-xs"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════
              7. STICKY BLINKIT BOTTOM FLOATING CART BAR
          ══════════════════════════════════════════════════════════ */}
          {cartCount > 0 && (
            <div className="fixed bottom-4 left-3 right-3 sm:left-6 sm:right-6 max-w-2xl mx-auto z-40 animate-in slide-in-from-bottom-5 duration-300">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#14432e] px-4 py-3 text-white shadow-2xl border border-white/20 backdrop-blur-md">
                {/* Left side: Cart count + price + savings */}
                <div className="flex items-center gap-3">
                  <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#fffa43] text-[#14432e] font-black">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-black text-white">
                      {cartCount}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base sm:text-lg font-black text-white">
                        {money(cartSubtotal)}
                      </span>
                      <span className="text-[11px] font-semibold text-white/70">
                        ({cartCount} {cartCount === 1 ? "item" : "items"})
                      </span>
                    </div>
                    {cartSavings > 0 && (
                      <p className="text-[10.5px] font-bold text-[#fffa43] flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 inline" />
                        <span>Saved {money(cartSavings)} vs retail price</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: View Cart / Checkout button */}
                <Link
                  to="/cart"
                  className="flex items-center gap-1.5 rounded-xl bg-[#fffa43] hover:bg-yellow-300 px-4 py-2 text-xs font-black text-[#14432e] shadow transition active:scale-95"
                >
                  <span>View Basket</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </PageMotion>
  );
}
