import {
  Heart,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBasket,
  Sparkles,
  Star,
  Store,
  Zap,
  X,
  BadgeCheck,
  CheckCircle2,
  ShieldCheck,
  Leaf,
  Info,
  TrendingDown,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "../store/useAppStore.js";
import { cx, money } from "../utils/format.js";
import { canShop } from "../utils/navigation.js";
import SmartImage from "./SmartImage.jsx";

export default function ProductCard({ product, fulfillmentStore = null }) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { user, cart, addToCart, updateCart, savedProducts, toggleSaved } = useAppStore();
  const shoppingEnabled = canShop(user?.role);
  const isSaved = savedProducts.some((item) => item._id === product._id);
  const isBulk = !fulfillmentStore && quantity >= product.bulkThreshold;
  const price = isBulk ? product.bulkPrice : product.retailPrice;

  // Cart item match for live Blinkit stepper
  const cartItem = cart.find(
    (item) =>
      item.productId === product._id ||
      (product.storeInventoryId && item.storeInventoryId === product.storeInventoryId),
  );
  const cartQty = cartItem ? Number(cartItem.quantity) : 0;
  const step = Number(product.quantityStep || product.minimumQuantity || 1);

  const marketPrice = Number(product.marketPrice || (fulfillmentStore ? product.retailPrice * 1.15 : 0));
  const savings = marketPrice > price ? marketPrice - price : 0;
  const discountPercent = marketPrice > price ? Math.round(((marketPrice - price) / marketPrice) * 100) : 0;

  const onAdd = (qtyToAdd = quantity) => {
    const currentCart = useAppStore.getState().cart;
    if (
      (fulfillmentStore && currentCart.some((item) => item.storeId && item.storeId !== fulfillmentStore._id)) ||
      (!fulfillmentStore && currentCart.some((item) => item.storeId))
    ) {
      toast.error("Your basket contains items from a different fulfilment channel. Clear it before adding this item.");
      return;
    }
    addToCart(
      fulfillmentStore
        ? {
            ...product,
            storeId: fulfillmentStore._id,
            storeName: fulfillmentStore.name,
            storeDistanceKm: fulfillmentStore.distanceKm,
            estimatedDeliveryMinutes: fulfillmentStore.estimatedDeliveryMinutes,
            storeInventoryId: product.storeInventoryId,
          }
        : product,
      qtyToAdd,
    );
    toast.success(`${qtyToAdd} ${product.unit} ${product.name} added`);
  };

  const handleBlinkitAdd = (e) => {
    e?.stopPropagation?.();
    const defaultQty = Number(product.minimumQuantity || 1);
    onAdd(defaultQty);
  };

  const handleBlinkitIncrement = (e) => {
    e?.stopPropagation?.();
    if (!cartItem) {
      handleBlinkitAdd(e);
      return;
    }
    const nextQty = Math.min(Number(product.availableQuantity), Number((cartQty + step).toFixed(2)));
    updateCart(cartItem.productId, nextQty);
  };

  const handleBlinkitDecrement = (e) => {
    e?.stopPropagation?.();
    if (!cartItem) return;
    const nextQty = Number((cartQty - step).toFixed(2));
    if (nextQty <= 0.001) {
      updateCart(cartItem.productId, 0);
      toast.info(`Removed ${product.name} from basket`);
    } else {
      updateCart(cartItem.productId, nextQty);
    }
  };

  const onSave = (e) => {
    e?.stopPropagation?.();
    toggleSaved(product);
    toast.success(t(isSaved ? "market.savedRemoved" : "market.savedAdded"));
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          1. BLINKIT-STYLE PRODUCT CARD (Mobile & Desktop)
      ══════════════════════════════════════════════════════════ */}
      <article
        onClick={() => setShowDetailModal(true)}
        className="card card-hover group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/90 bg-white transition hover:border-[#1d5f41]/50 hover:shadow-md cursor-pointer select-none"
      >
        <div>
          {/* Image Container with Badges */}
          <div className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden bg-forest-50/40">
            <SmartImage
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />

            {/* Discount / Savings Tag */}
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {discountPercent > 0 && (
                <span className="badge bg-[#1d5f41] text-[9.5px] sm:text-[10px] font-black text-white shadow-sm px-1.5 py-0.5">
                  {discountPercent}% OFF
                </span>
              )}
              {product.organic && (
                <span className="badge bg-lime-500 text-[9.5px] sm:text-[10px] font-black text-forest-950 shadow-sm px-1.5 py-0.5">
                  <Leaf className="h-2.5 w-2.5" /> Organic
                </span>
              )}
            </div>

            {/* Wishlist Button */}
            {shoppingEnabled && (
              <button
                type="button"
                className={cx(
                  "absolute right-2 top-2 grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:scale-110",
                  isSaved ? "text-red-500" : "text-gray-400 hover:text-red-500",
                )}
                aria-label={`${isSaved ? t("common.saved") : t("common.save")} ${product.name}`}
                aria-pressed={isSaved}
                onClick={onSave}
              >
                <Heart className={cx("h-3.5 w-3.5 sm:h-4 sm:w-4", isSaved && "fill-current")} />
              </button>
            )}

            {/* Delivery Time Pill */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[9.5px] sm:text-[10px] font-black text-gray-800 shadow-sm backdrop-blur-sm border border-gray-100">
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-amber-500 text-amber-500" />
              <span>{fulfillmentStore?.estimatedDeliveryMinutes || 15} MINS</span>
            </div>
          </div>

          {/* Product Details (No Seller Details - Urban Store Fulfilled) */}
          <div className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-gray-400">
              <span className="truncate uppercase tracking-wider text-forest-700">
                {product.category}
              </span>
              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                {product.rating || "4.8"}
              </span>
            </div>

            <h3 className="mt-1 font-display text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-forest-700 transition">
              {product.name}
            </h3>

            <p className="mt-1 text-[10px] sm:text-xs text-gray-500 font-semibold">
              1 {product.unit} {step < 1 ? `(Min. ${step}${product.unit})` : ""}
            </p>
          </div>
        </div>

        {/* Price & Blinkit ADD Button Section */}
        <div className="p-2.5 sm:p-3.5 pt-0">
          <div className="flex items-end justify-between gap-1.5 border-t border-gray-100 pt-2 sm:pt-2.5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-sm sm:text-base font-black text-gray-900">
                  {money(price)}
                </span>
                {marketPrice > price && (
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                    {money(marketPrice)}
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-[9px] sm:text-[10px] font-bold text-green-700">
                  Save {money(savings)}
                </p>
              )}
            </div>

            {shoppingEnabled && (
              <div onClick={(e) => e.stopPropagation()}>
                {cartQty > 0 ? (
                  /* Blinkit Live Quantity Stepper */
                  <div className="flex h-7 sm:h-8 items-center rounded-lg sm:rounded-xl bg-[#1d5f41] text-white shadow-sm font-black text-[11px] sm:text-xs overflow-hidden">
                    <button
                      type="button"
                      className="grid h-full w-6 sm:w-7 place-items-center hover:bg-black/15 transition active:scale-90"
                      onClick={handleBlinkitDecrement}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-5 sm:min-w-6 text-center px-0.5">
                      {cartQty}
                    </span>
                    <button
                      type="button"
                      className="grid h-full w-6 sm:w-7 place-items-center hover:bg-black/15 transition active:scale-90"
                      onClick={handleBlinkitIncrement}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  /* Blinkit ADD Button */
                  <button
                    type="button"
                    onClick={handleBlinkitAdd}
                    aria-label="Add to cart"
                    className="flex h-7 sm:h-8 items-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl border-2 border-[#1d5f41] bg-green-50/60 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black text-[#1d5f41] transition hover:bg-[#1d5f41] hover:text-white active:scale-95 shadow-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>ADD</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ══════════════════════════════════════════════════════════
          2. BLINKIT SMALL PRODUCT DETAILS POPUP MODAL
      ══════════════════════════════════════════════════════════ */}
      {showDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Close Button */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-forest-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Certified Urban Store Produce</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Product Image & Badges */}
            <div className="relative mt-4 aspect-video sm:aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50">
              <SmartImage
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                {discountPercent > 0 && (
                  <span className="badge bg-[#1d5f41] text-[10px] font-black text-white shadow-sm">
                    {discountPercent}% OFF
                  </span>
                )}
                {product.organic && (
                  <span className="badge bg-lime-500 text-[10px] font-black text-forest-950 shadow-sm">
                    <Leaf className="h-2.5 w-2.5" /> 100% Organic
                  </span>
                )}
                <span className="badge bg-white/95 text-gray-800 text-[10px] font-bold shadow-sm">
                  Grade {product.grade || "A"}
                </span>
              </div>
            </div>

            {/* Product Details */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
                  {product.category}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  {product.rating || "4.8"} / 5.0
                </span>
              </div>

              <h2 className="mt-1 font-display text-lg sm:text-xl font-bold text-gray-900">
                {product.name}
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Pack Size: <strong>1 {product.unit}</strong> {step < 1 ? `(Order in ${step}${product.unit} steps)` : ""}
              </p>

              {/* Fulfilment & Quality Highlights */}
              <div className="mt-3.5 rounded-xl border border-green-100 bg-green-50/60 p-3 text-xs text-gray-700 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#1d5f41]">
                  <Zap className="h-3.5 w-3.5 fill-current text-amber-500" />
                  <span>Express Delivery in {fulfillmentStore?.estimatedDeliveryMinutes || 15} Mins</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <Store className="h-3 w-3 text-forest-700 shrink-0" />
                  <span>Dispatched from {fulfillmentStore?.name || "Local Certified Kisan Store"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>Harvested &amp; sort-graded directly from local farmer collectives</span>
                </div>
              </div>
            </div>

            {/* Bottom Pricing & Cart Action */}
            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-extrabold text-gray-900">
                    {money(price)}
                  </span>
                  {marketPrice > price && (
                    <span className="text-xs text-gray-400 line-through">
                      {money(marketPrice)}
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-[10.5px] font-bold text-green-700 flex items-center gap-0.5">
                    <TrendingDown className="h-3 w-3 inline" />
                    <span>Saved {money(savings)} vs mandi price</span>
                  </p>
                )}
              </div>

              {shoppingEnabled && (
                <div>
                  {cartQty > 0 ? (
                    <div className="flex h-10 items-center rounded-xl bg-[#1d5f41] text-white shadow font-bold text-sm overflow-hidden">
                      <button
                        type="button"
                        className="grid h-full w-9 place-items-center hover:bg-black/15 transition"
                        onClick={handleBlinkitDecrement}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center px-1 font-extrabold">
                        {cartQty}
                      </span>
                      <button
                        type="button"
                        className="grid h-full w-9 place-items-center hover:bg-black/15 transition"
                        onClick={handleBlinkitIncrement}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBlinkitAdd}
                      aria-label="Add to cart"
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-[#1d5f41] px-5 text-xs font-black text-white shadow-md hover:bg-[#14432e] transition active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>ADD TO BASKET</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


