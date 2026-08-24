import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Leaf,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, getData } from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import {
  ErrorState,
  LoadingState,
  MetricCard,
  VerifiedBadge,
} from "../components/UI.jsx";
import { number } from "../utils/format.js";

export default function SellerDetailsPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["seller", id],
    queryFn: () => getData(api.get(`/sellers/${id}`)),
  });

  if (isLoading)
    return (
      <div className="container-page py-12">
        <LoadingState cards={3} />
      </div>
    );
  if (error || !data)
    return (
      <div className="container-page py-12">
        <ErrorState message="This seller profile is not available." />
      </div>
    );

  const { seller, products, stats, trust } = data;
  return (
    <div className="container-page py-8">
      <nav className="mb-6 flex items-center gap-2 text-xs text-gray-500">
        <Link to="/marketplace">Marketplace</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/farmers">Sellers</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-gray-800">{seller.name}</span>
      </nav>

      <section className="card overflow-hidden">
        <div className="h-32 bg-forest-900 sm:h-40">
          <div className="h-full bg-[radial-gradient(circle_at_20%_20%,rgba(184,221,101,.22),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,.1),transparent_30%)]" />
        </div>
        <div className="px-6 pb-7 sm:px-9">
          <div className="-mt-16 flex flex-col items-start gap-5 sm:flex-row sm:items-end">
            <img
              src={seller.image}
              alt={seller.name}
              className="h-32 w-32 rounded-[28px] border-4 border-white bg-white object-cover shadow-lg"
            />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="page-title">{seller.name}</h1>
                <VerifiedBadge />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Store className="h-4 w-4" /> {seller.type}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {seller.location}, Odisha
                </span>
                <span className="flex items-center gap-1.5 font-bold text-amber-700">
                  <Star className="h-4 w-4 fill-current" /> {seller.rating}
                  <span className="font-normal text-gray-500">
                    ({seller.reviews} reviews)
                  </span>
                </span>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Link
                to={`/marketplace?sellerId=${seller.id}`}
                className="btn-secondary"
              >
                Browse catalog
              </Link>
              <Link to="/bulk/new" className="btn-primary">
                Post requirement <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completed orders"
          value={number(seller.completedOrders)}
          detail="Platform history"
          icon={PackageCheck}
        />
        <MetricCard
          label="Fulfilment reliability"
          value={`${seller.reliability}%`}
          detail="Visible operational metric"
          icon={ClipboardCheck}
          tone="blue"
        />
        <MetricCard
          label="Active listings"
          value={stats.activeListings}
          detail={`${stats.categories.length} product categories`}
          icon={Boxes}
          tone="violet"
        />
        <MetricCard
          label="Available inventory"
          value={`${number(stats.availableQuantity)} units`}
          detail="Across published listings"
          icon={Leaf}
          tone="amber"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-6 sm:p-8">
          <p className="eyebrow">About the producer</p>
          <h2 className="section-title mt-2">Trusted local supply</h2>
          <p className="mt-4 max-w-3xl leading-7 text-gray-600">
            {seller.about}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              [ShieldCheck, "Verified marketplace identity", "The visible seller identity is linked to a verified development record."],
              [PackageCheck, "Lot-level traceability", trust.traceabilityAvailable ? "Quality and handling records are available for published lots." : "Traceability is added when a produce lot is published."],
              [Truck, "Fulfilment history", `${seller.reliability}% fulfilment reliability from platform activity.`],
              [CheckCircle2, "Privacy-safe profile", "Private phone, email and precise farm coordinates are not shown publicly."],
            ].map(([Icon, title, description]) => (
              <article key={title} className="rounded-2xl border border-gray-100 p-4">
                <Icon className="h-5 w-5 text-forest-700" />
                <h3 className="mt-3 text-sm font-bold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <aside className="card p-6">
          <p className="eyebrow">Current supply</p>
          <h2 className="mt-2 font-display text-xl font-bold">
            Inventory overview
          </h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Fresh lots</dt>
              <dd className="font-bold text-forest-700">{stats.freshLots}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Sell-soon / urgent</dt>
              <dd className="font-bold text-amber-700">{stats.sellSoonLots}</dd>
            </div>
            <div className="border-t pt-4">
              <dt className="text-xs text-gray-500">Categories supplied</dt>
              <dd className="mt-3 flex flex-wrap gap-2">
                {stats.categories.map((category) => (
                  <span
                    key={category}
                    className="badge bg-forest-50 text-forest-700"
                  >
                    {category}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <div className="mt-6 rounded-2xl bg-cream p-4 text-xs leading-5 text-gray-600">
            <strong className="block text-gray-800">Metric basis</strong>
            {trust.metricBasis}. Reliability is not a credit score or personal
            character assessment.
          </div>
        </aside>
      </div>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Seller catalog</p>
            <h2 className="section-title mt-2">Available from {seller.name}</h2>
            <p className="mt-2 text-sm text-gray-500">
              Published prices and inventory are revalidated at checkout.
            </p>
          </div>
          <Link to="/marketplace" className="btn-ghost">
            All marketplace products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {products.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-gray-500">
            This seller has no active listings right now.
          </div>
        )}
      </section>
    </div>
  );
}
