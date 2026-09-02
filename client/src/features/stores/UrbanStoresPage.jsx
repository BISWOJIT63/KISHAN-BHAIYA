import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bike,
  Building2,
  Clock3,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBasket,
  Store,
  AlertCircle,
  ShieldAlert,
  Truck,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { api, apiError, getData } from "../../api/client.js";
import { useAppStore } from "../../store/useAppStore.js";
import { money, number } from "../../utils/format.js";
import SmartImage from "../../components/SmartImage.jsx";
import {
  EmptyState,
  ErrorState,
  InlineLoader,
  LoadingState,
  PageHeader,
} from "../../components/UI.jsx";
import { PageMotion, Stagger, StaggerItem } from "../../components/Motion.jsx";

const ownershipLabel = (type) =>
  type === "GOVERNMENT" ? "Government-operated" : "Licensed franchise";

// Shared with the marketplace preview while keeping store data in one place.
// eslint-disable-next-line react-refresh/only-export-components
export const defaultFallbackStores = [
  {
    _id: "store-govt-bbsr",
    name: "KisanExpress Jan Seva Fresh Store - Patia",
    ownershipType: "GOVERNMENT",
    operatorName: "Public Market Operations",
    locationName: "Patia, Bhubaneswar",
    address: "Patia market district, Bhubaneswar",
    coordinates: [85.8254, 20.3547],
    serviceRadiusKm: 20,
    estimatedDeliveryMinutes: 22,
    status: "OPEN",
    rating: 4.8,
    hours: "06:00–22:00",
    distanceKm: 0.0,
    serviceable: true,
    availableItems: 6,
    facilities: ["Digital weighing", "Cold cabinet", "Quality desk", "20km express delivery"],
    inventory: [
      {
        _id: "stock-1-1",
        productId: "prod-tomato",
        stock: 45,
        price: 25.2,
        marketPrice: 28,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Fresh Desi Tomato", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-1-2",
        productId: "prod-potato",
        stock: 50,
        price: 21.6,
        marketPrice: 24,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Jyoti Potato", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-1-3",
        productId: "prod-onion",
        stock: 60,
        price: 28.8,
        marketPrice: 32,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Nasik Red Onion", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-1-4",
        productId: "prod-banana",
        stock: 35,
        price: 45,
        marketPrice: 50,
        minimumQuantity: 1,
        quantityStep: 1,
        product: { name: "Robusta Banana", category: "Fruits", unit: "dozen", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-1-5",
        productId: "prod-spinach",
        stock: 25,
        price: 18,
        marketPrice: 22,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Organic Palak (Spinach)", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-1-6",
        productId: "prod-turmeric",
        stock: 30,
        price: 160,
        marketPrice: 180,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Koraput Organic Turmeric", category: "Spices", unit: "kg", image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=400&q=80" },
      },
    ],
  },
  {
    _id: "store-franchise-sahidnagar",
    name: "KisanExpress Sahid Nagar Fresh Point",
    ownershipType: "FRANCHISE",
    operatorName: "Maa Tarini Urban Foods",
    locationName: "Sahid Nagar, Bhubaneswar",
    address: "Sahid Nagar market, Bhubaneswar",
    coordinates: [85.8412, 20.2919],
    serviceRadiusKm: 20,
    estimatedDeliveryMinutes: 18,
    status: "OPEN",
    rating: 4.7,
    hours: "06:30–22:30",
    distanceKm: 7.1,
    serviceable: true,
    availableItems: 5,
    facilities: ["Express packing", "EV delivery", "Digital weighing", "20km express delivery"],
    inventory: [
      {
        _id: "stock-2-1",
        productId: "prod-tomato",
        stock: 40,
        price: 24.6,
        marketPrice: 28,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Fresh Desi Tomato", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80" },
      },
      {
        _id: "stock-2-2",
        productId: "prod-onion",
        stock: 55,
        price: 28.2,
        marketPrice: 32,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Nasik Red Onion", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80" },
      },
    ],
  },
  {
    _id: "store-franchise-khandagiri",
    name: "KisanExpress Khandagiri Fresh Point",
    ownershipType: "FRANCHISE",
    operatorName: "Kalinga Farmers Collective",
    locationName: "Khandagiri, Bhubaneswar",
    address: "Khandagiri Square, Bhubaneswar",
    coordinates: [85.7876, 20.2587],
    serviceRadiusKm: 20,
    estimatedDeliveryMinutes: 20,
    status: "OPEN",
    rating: 4.7,
    hours: "06:30–22:00",
    distanceKm: 11.3,
    serviceable: true,
    availableItems: 5,
    facilities: ["EV express delivery", "Farm-gate direct stock", "Quality check desk", "20km express delivery"],
    inventory: [
      {
        _id: "stock-3-1",
        productId: "prod-tomato",
        stock: 38,
        price: 25.0,
        marketPrice: 28,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Fresh Desi Tomato", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80" },
      },
    ],
  },
  {
    _id: "store-govt-cuttack",
    name: "KisanExpress Cuttack Public Fresh Store",
    ownershipType: "GOVERNMENT",
    operatorName: "Public Market Operations",
    locationName: "Badambadi, Cuttack",
    address: "Badambadi urban market, Cuttack",
    coordinates: [85.8793, 20.4547],
    serviceRadiusKm: 20,
    estimatedDeliveryMinutes: 25,
    status: "OPEN",
    rating: 4.6,
    hours: "06:00–21:30",
    distanceKm: 12.3,
    serviceable: true,
    availableItems: 5,
    facilities: ["Collection hub linked", "Quality desk", "Reusable crates", "20km express delivery"],
    inventory: [
      {
        _id: "stock-4-1",
        productId: "prod-potato",
        stock: 50,
        price: 21.6,
        marketPrice: 24,
        minimumQuantity: 0.25,
        quantityStep: 0.25,
        product: { name: "Jyoti Potato", category: "Vegetables", unit: "kg", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80" },
      },
    ],
  },
  {
    _id: "store-govt-puri",
    name: "KisanExpress Puri Grand Road Depot",
    ownershipType: "GOVERNMENT",
    operatorName: "Shree Jagannath Agri Kendra",
    locationName: "Grand Road, Puri",
    address: "Grand Road Temple Market, Puri",
    coordinates: [85.8312, 19.8135],
    serviceRadiusKm: 20,
    estimatedDeliveryMinutes: 28,
    status: "OPEN",
    rating: 4.9,
    hours: "06:00–22:00",
    distanceKm: 60.5,
    serviceable: false,
    availableItems: 4,
    facilities: ["Fresh temple lot sorting", "Cold storage", "Digital weighing", "20km express delivery"],
    inventory: [
      {
        _id: "stock-5-1",
        productId: "prod-coconut",
        stock: 60,
        price: 40,
        marketPrice: 45,
        minimumQuantity: 1,
        quantityStep: 1,
        product: { name: "Fresh Green Coconut", category: "Fruits", unit: "piece", image: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=400&q=80" },
      },
    ],
  },
];

const locationPresets = [
  { name: "Patia Market District, Bhubaneswar", coordinates: [85.8254, 20.3547] },
  { name: "Sahid Nagar, Bhubaneswar", coordinates: [85.8412, 20.2919] },
  { name: "Khandagiri, Bhubaneswar", coordinates: [85.7876, 20.2587] },
  { name: "Badambadi, Cuttack", coordinates: [85.8793, 20.4547] },
  { name: "Grand Road, Puri", coordinates: [85.8312, 19.8135] },
];

function calculateDeliveryFee(distanceKm, subtotal) {
  if (distanceKm === null || distanceKm === undefined || distanceKm <= 5) {
    return {
      fee: subtotal >= 299 ? 0 : 20,
      isFree: subtotal >= 299,
      tier: "Local Express (< 5 km)",
      isDeliverable: true,
    };
  }
  if (distanceKm > 20) {
    return {
      fee: 0,
      isFree: false,
      tier: "Beyond 20km Radius (Delivery Unavailable)",
      isDeliverable: false,
    };
  }
  if (distanceKm <= 10) {
    return {
      fee: 40,
      isFree: false,
      tier: "City Express (5–10 km)",
      isDeliverable: true,
    };
  }
  if (distanceKm <= 15) {
    return {
      fee: 65,
      isFree: false,
      tier: "Suburban Zone (10–15 km)",
      isDeliverable: true,
    };
  }
  return {
    fee: 95,
    isFree: false,
    tier: "Outer Perimeter (15–20 km)",
    isDeliverable: true,
  };
}

export function UrbanStoresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const isBusinessBuyer = user?.role === "business_buyer";

  const [selectedLocationName, setSelectedLocationName] = useState(
    user?.location || "Patia Market District, Bhubaneswar"
  );
  const [coordinates, setCoordinates] = useState(
    user?.locationCoordinates?.length === 2
      ? user.locationCoordinates
      : [85.8254, 20.3547]
  );

  const [selectedId, setSelectedId] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState({});
  const [address, setAddress] = useState(user?.location || "Patia Market District, Bhubaneswar");

  const { data: apiStores = [] } = useQuery({
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

  const selectedStore =
    stores.find((item) => item._id === selectedId) || stores[0];

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        (selectedStore?.inventory || [])
          .map((item) => item.product?.category)
          .filter(Boolean),
      ),
    ],
    [selectedStore],
  );

  const inventory = (selectedStore?.inventory || []).filter(
    (item) => category === "All" || item.product?.category === category,
  );

  const lines = (selectedStore?.inventory || [])
    .filter((item) => Number(cart[item._id]) > 0)
    .map((item) => ({ ...item, quantity: Number(cart[item._id]) }));

  const subtotal = lines.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  const savings = lines.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.marketPrice) - Number(item.price)) *
        item.quantity,
    0,
  );

  const deliveryInfo = calculateDeliveryFee(selectedStore?.distanceKm, subtotal);
  const handlingFee = lines.length ? 5 : 0;
  const orderTotal = subtotal + (deliveryInfo.isDeliverable ? deliveryInfo.fee : 0) + handlingFee;

  const handleLocationSelect = (preset) => {
    setSelectedLocationName(preset.name);
    setCoordinates(preset.coordinates);
    setAddress(preset.name);
    toast.success(`Location updated to ${preset.name}`);
  };

  const setQuantity = (item, next) => {
    if (isBusinessBuyer) {
      toast.info("Bulk Buyer Notice", {
        description:
          "Business buyers procure directly from producers in wholesale quantities on the Bulk Procurement portal.",
      });
      return;
    }
    const step = Number(item.quantityStep || item.minimumQuantity || 1);
    const safe = Math.max(
      0,
      Math.min(Number(item.stock), Number(next.toFixed(2))),
    );
    setCart((current) => ({ ...current, [item._id]: safe < step ? 0 : safe }));
  };

  const checkout = useMutation({
    mutationFn: () => {
      if (isBusinessBuyer) {
        throw new Error("Business buyers must use the Bulk Procurement portal for wholesale orders.");
      }
      if (!deliveryInfo.isDeliverable) {
        throw new Error("Delivery is only supported within a 20 km radius of this store.");
      }
      return getData(
        api.post(`/urban-stores/${selectedStore._id}/orders`, {
          items: lines.map((item) => ({
            inventoryId: item._id,
            quantity: item.quantity,
          })),
          deliveryAddress: address,
          deliveryCoordinates: coordinates,
          paymentMethod: "COD",
        }),
      );
    },
    onSuccess: (result) => {
      toast.success("Express order confirmed", {
        description: `${result.urbanStore?.name || "KisanExpress Store"} linked your order to the urban delivery network.`,
      });
      setCart({});
      queryClient.invalidateQueries({ queryKey: ["urban-stores"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      navigate(`/orders/${result.order._id}`);
    },
    onError: (reason) => toast.error(apiError(reason)),
  });

  return (
    <PageMotion className="container-page py-8 sm:py-10">
      
      {/* Location Selector Bar - Centered */}
      <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center gap-3 max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="w-8 h-8 rounded-lg bg-green-50 text-[#1d5f41] flex items-center justify-center shrink-0 border border-green-200">
            <Navigation className="w-4 h-4" />
          </span>
          <div>
            <p className="text-gray-400 font-medium text-[10.5px] uppercase tracking-wide">Current Delivery Area</p>
            <p className="font-bold text-gray-900">{selectedLocationName}</p>
          </div>
        </div>

        {/* Quick Location Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
          <span className="text-[11px] text-gray-500 mr-1 hidden sm:inline">Change Area:</span>
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

      {/* Business Buyer Notice Banner - Centered */}
      {isBusinessBuyer && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-5 text-amber-900 flex flex-col items-center justify-center text-center gap-3 shadow-sm max-w-3xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-1">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Bulk Buyer Account Active</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-xl mx-auto">
              Urban Stores are designed for household consumers purchasing small retail quantities (250g–5kg). As a verified Business Buyer, your account is configured for <strong>Bulk Procurement &amp; Direct Wholesale Bidding</strong>.
            </p>
          </div>
          <Link
            to="/bulk"
            className="mt-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow flex items-center gap-1.5"
          >
            <span>Open Bulk Procurement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Header Banner */}
      <section className="relative overflow-hidden rounded-[24px] bg-[#1d5f41] px-6 py-8 text-white sm:px-10 lg:px-12 shadow-lg">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(184,221,101,.22),transparent_65%)]" />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-white/10 text-white border border-white/20">
              <Building2 className="h-3.5 w-3.5" />
              Public &amp; Franchise Outlets
            </span>
            <span className="badge bg-[#fffa43] text-[#14432e] font-bold">
              <Truck className="h-3.5 w-3.5" />
              20km Max Delivery Radius
            </span>
            <span className="badge bg-lime-300 text-forest-950 font-bold">
              <Clock3 className="h-3.5 w-3.5" />
              18–30 min Target
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Urban Kisan Stores
          </h1>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-forest-100/90">
            Buy trusted farm produce in household quantities from nearby government-operated and licensed franchise outlets within a <strong>20km delivery radius</strong>. Stock is stored locally in city cold rooms and dispatched via last-mile drivers.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-forest-100">
            <span className="flex items-center gap-1">
              <BadgeIndianRupee className="h-4 w-4 text-[#fffa43]" />
              Lower urban pack rates
            </span>
            <span className="flex items-center gap-1">
              <PackageCheck className="h-4 w-4 text-[#fffa43]" />
              250g minimum pack sizes
            </span>
            <span className="flex items-center gap-1">
              <Bike className="h-4 w-4 text-[#fffa43]" />
              Distance-based delivery (₹20 to ₹95)
            </span>
          </div>
        </div>
      </section>

      {/* Store Selection Grid */}
      <section className="mt-8">
        <PageHeader
          eyebrow="Nearby Outlets (20km Delivery Radius)"
          title="Choose your fulfilment store"
          description={`Showing stores calculated from ${selectedLocationName}. Deliveries are supported up to 20 km.`}
        />
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((urbanStore) => {
            const isSelected = selectedStore?._id === urbanStore._id;
            const dist = urbanStore.distanceKm;
            const isDeliverable = dist === null || dist <= 20;

            return (
              <StaggerItem key={urbanStore._id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(urbanStore._id);
                    setCart({});
                  }}
                  className={`h-full w-full rounded-2xl border p-4 sm:p-5 text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "border-[#1d5f41] bg-green-50/70 shadow-md ring-2 ring-[#1d5f41]/20"
                      : "border-gray-200 bg-white hover:border-[#1d5f41]/50 hover:shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1d5f41] shadow-sm border border-gray-100">
                        <Store className="h-5 w-5" />
                      </span>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`badge text-[10.5px] font-bold ${
                            urbanStore.ownershipType === "GOVERNMENT"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {ownershipLabel(urbanStore.ownershipType)}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">
                          ⭐ {urbanStore.rating || "4.8"}
                        </span>
                      </div>
                    </div>

                    <h2 className="mt-3 font-display text-base sm:text-lg font-bold text-gray-900 leading-snug">
                      {urbanStore.name}
                    </h2>
                    <p className="mt-1 text-xs text-gray-600 flex items-center">
                      <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#1d5f41] shrink-0" />
                      <span className="truncate">{urbanStore.locationName}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                      <span className={dist !== null && dist > 20 ? "text-red-600 font-bold" : "text-[#1d5f41] font-bold"}>
                        {dist === null || dist === 0
                          ? "🎯 Located in your area"
                          : `${dist} km away`}
                      </span>
                      <span>{urbanStore.estimatedDeliveryMinutes || 25} min</span>
                      <span>{urbanStore.availableItems || 6} items</span>
                    </div>

                    {!isDeliverable && (
                      <p className="mt-2 text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Beyond 20km delivery limit</span>
                      </p>
                    )}
                  </div>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* Selected Store Items & Basket */}
      {selectedStore && (
        <div className="mt-10 grid gap-7 xl:grid-cols-[1fr_360px]">
          {/* Items Section */}
          <section>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="eyebrow text-[#1d5f41]">
                  {ownershipLabel(selectedStore.ownershipType)} Outlet
                </span>
                <h2 className="section-title mt-1 text-xl sm:text-2xl font-bold">
                  Stock at {selectedStore.locationName}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Open {selectedStore.hours} · Operated by {selectedStore.operatorName}
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition border ${
                      category === item
                        ? "bg-[#1d5f41] text-white border-[#1d5f41]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {inventory.length ? (
              <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inventory.map((item) => {
                  const quantity = Number(cart[item._id] || 0);
                  const step = Number(
                    item.quantityStep || item.minimumQuantity || 1,
                  );
                  return (
                    <StaggerItem key={item._id}>
                      <article className="card h-full overflow-hidden flex flex-col justify-between border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition">
                        <div>
                          <SmartImage
                            src={item.product?.image}
                            alt={item.product?.name}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="badge bg-green-50 text-[#1d5f41] font-bold text-[10px]">
                                {item.product?.category}
                              </span>
                              <span className="text-[11px] font-bold text-amber-700">
                                Save {money(Math.max(0, (item.marketPrice || item.price * 1.15) - item.price), 1)}/{item.product?.unit}
                              </span>
                            </div>
                            <h3 className="mt-2.5 font-display text-base font-bold text-gray-900">
                              {item.product?.name}
                            </h3>
                            <p className="mt-1 text-[11px] text-gray-500">
                              {number(item.stock)} {item.product?.unit} available · Min {item.minimumQuantity} {item.product?.unit}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-0">
                          <div className="flex items-end justify-between border-t border-gray-100 pt-3">
                            <div>
                              <p className="font-display text-lg font-extrabold text-[#1d5f41]">
                                {money(item.price, 1)}
                                <span className="text-xs font-normal text-gray-500">
                                  /{item.product?.unit}
                                </span>
                              </p>
                              <p className="text-[11px] text-gray-400 line-through">
                                {money(item.marketPrice || item.price * 1.15, 1)}
                              </p>
                            </div>

                            {isBusinessBuyer ? (
                              <button
                                onClick={() =>
                                  toast.info("Bulk Purchasing Required", {
                                    description: "Please post or browse wholesale lots on the Bulk Procurement portal.",
                                  })
                                }
                                className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg"
                              >
                                Retail Only
                              </button>
                            ) : quantity ? (
                              <div className="flex items-center gap-1.5 rounded-xl border border-forest-200 bg-forest-50 p-1">
                                <button
                                  className="grid h-7 w-7 place-items-center text-forest-800 hover:bg-white rounded-lg transition"
                                  onClick={() => setQuantity(item, quantity - step)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-8 text-center text-xs font-bold">
                                  {quantity}
                                </span>
                                <button
                                  className="grid h-7 w-7 place-items-center text-forest-800 hover:bg-white rounded-lg transition"
                                  onClick={() => setQuantity(item, quantity + step)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn-primary min-h-9 px-3.5 text-xs font-bold rounded-xl flex items-center gap-1"
                                onClick={() => setQuantity(item, step)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            ) : (
              <EmptyState title="No items in this category" />
            )}
          </section>

          {/* Express Basket Sidebar */}
          <aside className="xl:sticky xl:top-32 xl:self-start">
            <section className="card p-5 rounded-2xl border border-gray-200 shadow-sm bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <p className="eyebrow text-[#1d5f41]">Express basket</p>
                  <h2 className="mt-1 font-display text-lg font-bold text-gray-900">
                    {lines.length} item{lines.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <ShoppingBasket className="h-6 w-6 text-[#1d5f41]" />
              </div>

              {lines.length ? (
                <>
                  <div className="mt-4 space-y-3 max-h-56 overflow-y-auto pr-1">
                    {lines.map((item) => (
                      <div
                        key={item._id}
                        className="flex justify-between gap-3 border-b border-gray-100 pb-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{item.product?.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {item.quantity} {item.product?.unit} @ {money(item.price)}/{item.product?.unit}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900">
                          {money(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="mt-4 space-y-2 text-xs border-t border-gray-100 pt-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">{money(subtotal)}</span>
                    </div>

                    <div className="flex justify-between font-semibold text-green-700">
                      <span>Store savings</span>
                      <span>-{money(savings)}</span>
                    </div>

                    <div className="flex justify-between text-gray-600 items-center">
                      <div>
                        <span>Delivery</span>
                        <p className="text-[10px] text-gray-400">
                          {selectedStore.distanceKm !== null ? `${selectedStore.distanceKm} km · ` : ""}
                          {deliveryInfo.tier}
                        </p>
                      </div>
                      <span className="font-semibold">
                        {!deliveryInfo.isDeliverable ? (
                          <span className="text-red-600 font-bold">Unavailable (&gt;20km)</span>
                        ) : deliveryInfo.isFree ? (
                          <span className="text-green-700 font-bold">FREE</span>
                        ) : (
                          money(deliveryInfo.fee)
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Handling fee</span>
                      <span>{money(handlingFee)}</span>
                    </div>

                    <div className="flex justify-between border-t border-gray-200 pt-3 font-display text-base font-bold text-gray-900">
                      <span>Estimated Total</span>
                      <span className="text-[#1d5f41]">
                        {money(orderTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Distance notice banner */}
                  {!deliveryInfo.isDeliverable ? (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] leading-relaxed">
                      <strong>⚠️ Delivery Unavailable:</strong> This store only delivers within a 20 km radius. Your location is {selectedStore.distanceKm} km away. Please select a closer store.
                    </div>
                  ) : (
                    <div className="mt-3 text-[10.5px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      ✓ Serviceable ({selectedStore.distanceKm ?? 0} km away). Orders under 5km above ₹299 get free delivery.
                    </div>
                  )}

                  {/* Delivery Address Field */}
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-gray-700">Urban Delivery Address</span>
                    <textarea
                      className="textarea min-h-20 text-xs mt-1 w-full"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="House/flat number, street, landmark..."
                    />
                  </label>

                  {/* Submit Button */}
                  {isBusinessBuyer ? (
                    <div className="mt-4">
                      <button disabled className="btn-secondary w-full text-xs opacity-60">
                        Retail Shopping Restricted for Business Buyers
                      </button>
                      <Link to="/bulk" className="btn-primary mt-2 w-full text-xs text-center justify-center">
                        Go to Bulk Procurement
                      </Link>
                    </div>
                  ) : (
                    <button
                      className="btn-primary mt-4 w-full text-xs font-bold"
                      disabled={
                        checkout.isPending ||
                        address.trim().length < 5 ||
                        !deliveryInfo.isDeliverable ||
                        !selectedStore.serviceable
                      }
                      onClick={() => checkout.mutate()}
                    >
                      {checkout.isPending ? (
                        <InlineLoader label="Assigning store & driver…" />
                      ) : (
                        <>
                          <span>Place Express Order</span>
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </button>
                  )}

                  <p className="mt-2.5 text-center text-[10.5px] text-gray-400">
                    Pay on delivery via Cash or UPI upon driver handover.
                  </p>
                </>
              ) : (
                <div className="mt-5 rounded-xl bg-[#fafafc] border border-gray-100 p-6 text-center text-xs text-gray-500">
                  <p className="font-semibold text-gray-700">Your basket is empty</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Add fresh vegetables or fruits from this store to start your order.
                  </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </PageMotion>
  );
}
