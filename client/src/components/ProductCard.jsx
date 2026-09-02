import {
  Heart,
  MapPin,
  Minus,
  Plus,
  ShoppingBasket,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "../store/useAppStore.js";
import { cx, money, shortDate } from "../utils/format.js";
import { canShop } from "../utils/navigation.js";
import SmartImage from "./SmartImage.jsx";
import { VerifiedBadge } from "./UI.jsx";

export default function ProductCard({ product }) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const { user, addToCart, savedProducts, toggleSaved } = useAppStore();
  const shoppingEnabled = canShop(user?.role);
  const isSaved = savedProducts.some((item) => item._id === product._id);
  const isBulk = quantity >= product.bulkThreshold;
  const price = isBulk ? product.bulkPrice : product.retailPrice;

  const onAdd = () => {
    addToCart(product, quantity);
    toast.success(`${quantity}${product.unit} ${product.name} added`);
  };
  const onSave = () => {
    toggleSaved(product);
    toast.success(t(isSaved ? "market.savedRemoved" : "market.savedAdded"));
  };

  return (
    <article className="card card-hover group overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-forest-50">
        <Link to={`/product/${product._id}`}>
          <SmartImage
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        {shoppingEnabled && <button
          className={cx(
            "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm",
            isSaved ? "text-red-500" : "text-gray-500 hover:text-red-500",
          )}
          aria-label={`${isSaved ? t("common.saved") : t("common.save")} ${product.name}`}
          aria-pressed={isSaved}
          onClick={onSave}
        >
          <Heart className={cx("h-4 w-4", isSaved && "fill-current")} />
        </button>}
        {product.organic && (
          <span className="badge absolute left-3 top-3 bg-white/95 text-forest-700 shadow-sm">
            <Sparkles className="h-3 w-3" /> Organic
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">
              {product.category} · Grade {product.grade}
            </p>
            <Link
              to={`/product/${product._id}`}
              className="mt-1 block font-display text-lg font-extrabold leading-tight text-ink hover:text-forest-700"
            >
              {product.name}
            </Link>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
            <Star className="h-3 w-3 fill-current" /> {product.rating}
          </div>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <strong className="font-display text-xl text-forest-900">
            {money(price)}
          </strong>
          <span className="pb-0.5 text-xs text-gray-500">/{product.unit}</span>
          {isBulk && (
            <span className="badge ml-auto bg-forest-50 text-forest-700">
              {t("market.bulkPrice")}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-y border-gray-100 py-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {product.seller?.location} ·{" "}
            {8 + (product.name.length % 23)} km
          </span>
          <span>
            {t("market.left", {
              quantity: product.availableQuantity,
              unit: product.unit,
            })}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">
              {product.seller?.name}
            </p>
            <VerifiedBadge compact />
          </div>
          <span className="text-right text-[11px] leading-4 text-gray-500">
            {shortDate(product.harvestDate)}
          </span>
        </div>
        {shoppingEnabled && <div className="mt-4 flex gap-2">
          <div className="flex h-11 items-center rounded-xl border border-gray-200">
            <button
              className="grid h-full w-9 place-items-center text-gray-500 hover:text-forest-700"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 text-center text-sm font-bold">
              {quantity}
            </span>
            <button
              className="grid h-full w-9 place-items-center text-gray-500 hover:text-forest-700"
              onClick={() =>
                setQuantity(Math.min(product.availableQuantity, quantity + 1))
              }
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button className="btn-primary flex-1 px-3" onClick={onAdd}>
            <ShoppingBasket className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.add")}</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>}
      </div>
    </article>
  );
}
