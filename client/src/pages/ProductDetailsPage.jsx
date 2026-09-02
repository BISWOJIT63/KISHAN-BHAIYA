import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingBasket,
  Snowflake,
  Star,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import {
  ErrorState,
  LoadingState,
  VerifiedBadge,
} from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { cx, money, number, shortDate } from "../utils/format.js";
import SmartImage from '../components/SmartImage.jsx';
import { ProductReviews } from './ReviewPages.jsx';

const tabs = ["Overview", "Quality details", "Seller", "Reviews"];

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    addToCart,
    addRecentProduct,
    recentProducts,
    savedProducts,
    toggleSaved,
  } = useAppStore();
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState("Overview");
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getData(api.get(`/products/${id}`)),
  });
  const { data: related = [], isLoading: relatedLoading } = useQuery({
    queryKey: ["product", id, "related"],
    queryFn: () => getData(api.get(`/products/${id}/related`, { params: { limit: 4 } })),
  });

  useEffect(() => {
    if (product) addRecentProduct(product);
  }, [product, addRecentProduct]);

  if (isLoading)
    return (
      <div className="container-page py-12">
        <LoadingState cards={2} />
      </div>
    );
  if (error || !product)
    return (
      <div className="container-page py-12">
        <ErrorState message="This produce listing could not be found." />
      </div>
    );

  const isBulk = quantity >= product.bulkThreshold;
  const price = isBulk ? product.bulkPrice : product.retailPrice;
  const isSaved = savedProducts.some((item) => item._id === product._id);
  const recentlyViewed = recentProducts
    .filter((item) => item._id !== product._id)
    .slice(0, 4);
  const addItem = (buy = false) => {
    addToCart(product, quantity);
    toast.success("Added to your harvest basket");
    if (buy) navigate("/checkout");
  };
  const saveProduct = () => {
    toggleSaved(product);
    toast.success(isSaved ? "Removed from saved produce" : "Saved for later");
  };
  const shareProduct = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Product link copied");
      }
    } catch {
      // Cancelling a system share sheet needs no error message.
    }
  };

  return (
    <div className="container-page py-8">
      <nav className="mb-6 flex items-center gap-2 text-xs text-gray-500">
        <Link to="/marketplace">Marketplace</Link>
        <ChevronRight className="h-3 w-3" />
        <span>{product.category}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-gray-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr]">
        <div>
          <div className="card relative aspect-[5/4] overflow-hidden">
            <SmartImage
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 flex gap-2">
              {product.organic && (
                <span className="badge bg-white text-forest-700">Organic</span>
              )}
              <span className="badge bg-white text-forest-700">
                Grade {product.grade}
              </span>
            </div>
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm",
                  isSaved ? "text-red-500" : "text-gray-600",
                )}
                onClick={saveProduct}
                aria-label={`${isSaved ? "Remove saved" : "Save"} ${product.name}`}
                aria-pressed={isSaved}
              >
                <Heart className={cx("h-5 w-5", isSaved && "fill-current")} />
              </button>
              <button
                className="grid h-10 w-10 place-items-center rounded-xl bg-white text-gray-600 shadow-sm"
                onClick={shareProduct}
                aria-label={`Share ${product.name}`}
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[product.image, product.image, product.image, product.image].map(
              (image, index) => (
                <button
                  key={index}
                  className={cx(
                    "aspect-[4/3] overflow-hidden rounded-2xl border-2",
                    index === 0
                      ? "border-forest-600"
                      : "border-transparent opacity-65 hover:opacity-100",
                  )}
                >
                  <SmartImage
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ),
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow">{product.category} · Lot ready</p>
          <h1 className="page-title mt-2">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 text-sm font-bold text-amber-700">
              <Star className="h-4 w-4 fill-current" /> {product.rating}
              <span className="font-normal text-gray-500">
                ({product.reviews} reviews)
              </span>
            </span>
            <VerifiedBadge />
          </div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="font-display text-4xl font-extrabold text-forest-900">
              {money(price)}
            </strong>
            <span className="pb-1 text-gray-500">/{product.unit}</span>
            {isBulk && (
              <span className="badge mb-1 bg-forest-100 text-forest-800">
                Bulk price unlocked
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Published bulk price {money(product.bulkPrice)}/{product.unit} from{" "}
            {number(product.bulkThreshold)} {product.unit}
          </p>
          <p className="mt-6 leading-7 text-gray-600">{product.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-forest-50 p-4">
              <CalendarDays className="h-5 w-5 text-forest-700" />
              <p className="mt-2 text-xs text-gray-500">Harvest date</p>
              <p className="mt-1 text-sm font-bold">
                {shortDate(product.harvestDate)}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <PackageCheck className="h-5 w-5 text-amber-700" />
              <p className="mt-2 text-xs text-gray-500">Available now</p>
              <p className="mt-1 text-sm font-bold">
                {number(product.availableQuantity)} {product.unit}
              </p>
            </div>
          </div>
          <div className="mt-7 border-y border-gray-200 py-6">
            <label className="label">Choose quantity ({product.unit})</label>
            <div className="flex gap-3">
              <div className="flex h-12 items-center rounded-xl border border-gray-200">
                <button
                  className="grid h-full w-12 place-items-center"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  className="w-16 text-center font-bold outline-none"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.max(
                        1,
                        Math.min(
                          product.availableQuantity,
                          Number(event.target.value) || 1,
                        ),
                      ),
                    )
                  }
                  aria-label="Quantity"
                />
                <button
                  className="grid h-full w-12 place-items-center"
                  onClick={() =>
                    setQuantity(
                      Math.min(product.availableQuantity, quantity + 1),
                    )
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button className="btn-primary flex-1" onClick={() => addItem(false)}>
                <ShoppingBasket className="h-4 w-4" /> {t("common.add")}
              </button>
              <button
                className="btn-secondary hidden flex-1 sm:inline-flex"
                onClick={() => addItem(true)}
              >
                Buy now
              </button>
            </div>
            {quantity >= 50 && quantity < product.bulkThreshold && (
              <p className="mt-3 text-xs font-semibold text-forest-700">
                Add {product.bulkThreshold - quantity} {product.unit} more to
                unlock the published bulk price, or post a custom requirement.
              </p>
            )}
          </div>

          <article className="card mt-6 p-5">
            <div className="flex gap-4">
              <SmartImage
                variant="avatar"
                src={product.seller?.image}
                alt={product.seller?.name}
                className="h-14 w-14 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold">
                      {product.seller?.name}
                    </h2>
                    <VerifiedBadge compact />
                  </div>
                  <Link
                    className="btn-ghost hidden sm:inline-flex"
                    to={`/sellers/${product.sellerId}`}
                  >
                    View seller <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>
                    <MapPin className="mr-1 inline h-3.5 w-3.5" />
                    {product.seller?.location}
                  </span>
                  <span>{product.seller?.completedOrders} completed orders</span>
                  <span>{product.seller?.reliability}% fulfilment</span>
                </div>
                <Link
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-forest-700 sm:hidden"
                  to={`/sellers/${product.sellerId}`}
                >
                  View seller profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>

      <section className="card mt-10 overflow-hidden">
        <div className="flex overflow-auto border-b border-gray-100 px-4 sm:px-7">
          {tabs.map((item) => (
            <button
              key={item}
              className={cx(
                "whitespace-nowrap border-b-2 px-4 py-4 text-sm font-bold",
                tab === item
                  ? "border-forest-700 text-forest-800"
                  : "border-transparent text-gray-500",
              )}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="p-6 sm:p-8">
          {tab === "Overview" ? (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <h2 className="section-title">Farm to you</h2>
                <p className="mt-3 leading-7 text-gray-600">
                  Known handling milestones make the journey visible. Live
                  locations appear only after a shipment is assigned.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {[
                    ["Farm", ShieldCheck],
                    ["Collection", Truck],
                    ["Quality check", PackageCheck],
                    ["Delivery", MapPin],
                  ].map(([label, Icon], index) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2 text-xs font-bold text-forest-800">
                        <Icon className="h-4 w-4" /> {label}
                      </span>
                      {index < 3 && (
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border p-4">
                  <Clock3 className="h-5 w-5 text-forest-700" />
                  <p className="mt-3 text-xs text-gray-500">
                    Expected shelf life
                  </p>
                  <p className="mt-1 font-bold">{product.shelfLifeDays} days</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <Snowflake className="h-5 w-5 text-blue-600" />
                  <p className="mt-3 text-xs text-gray-500">Storage</p>
                  <p className="mt-1 font-bold">Cool & ventilated</p>
                </div>
                <Link
                  to="/lot/lot-001/passport"
                  className="col-span-2 flex items-center justify-between rounded-2xl bg-forest-900 p-4 text-white"
                >
                  <span className="flex items-center gap-3">
                    <QrCode className="h-6 w-6" />
                    <span>
                      <strong className="block">View quality passport</strong>
                      <small className="text-forest-100/70">
                        Origin and handling traceability
                      </small>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : tab === "Seller" ? (
            <div className="flex max-w-3xl flex-col items-start gap-4 sm:flex-row sm:items-center">
              <SmartImage
                variant="avatar"
                src={product.seller?.image}
                alt={product.seller?.name}
                className="h-20 w-20 rounded-3xl object-cover"
              />
              <div className="flex-1">
                <h2 className="font-display text-xl font-bold">
                  {product.seller?.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Review the seller’s active catalog, fulfilment history and
                  public-safe trust information before purchasing.
                </p>
              </div>
              <Link to={`/sellers/${product.sellerId}`} className="btn-primary">
                Seller profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : tab === "Reviews" ? (
            <ProductReviews productId={product._id} />
          ) : (
            <div className="max-w-3xl">
              <h2 className="font-display text-xl font-bold">{tab}</h2>
              <p className="mt-3 leading-7 text-gray-600">
                This verified marketplace record combines producer-provided
                information with platform transaction history. Quality indicators
                are operational references, not food-safety guarantees.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">More choices</p>
            <h2 className="section-title mt-2">Related products</h2>
            <p className="mt-2 text-sm text-gray-500">
              Selected by category, seller, production method and rating.
            </p>
          </div>
          <Link to={`/marketplace?category=${product.category}`} className="btn-ghost">
            View category <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {relatedLoading ? (
          <LoadingState cards={4} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        )}
      </section>

      {recentlyViewed.length > 0 && (
        <section className="mt-14 border-t border-gray-200 pt-10">
          <div className="mb-6">
            <p className="eyebrow">Continue browsing</p>
            <h2 className="section-title mt-2">Recently viewed</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyViewed.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
