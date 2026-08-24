import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  IndianRupee,
  MapPin,
  MessageSquareMore,
  PackageCheck,
  Plus,
  RefreshCcw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  UsersRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import { useAppStore } from "../store/useAppStore.js";
import {
  EmptyState,
  ErrorState,
  InlineLoader,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  Progress,
  StatusBadge,
  VerifiedBadge,
} from "../components/UI.jsx";
import { money, number, relative, shortDate } from "../utils/format.js";

const requirementSchema = z.object({
  product: z.string().min(2, "Choose a product"),
  category: z.string().min(2),
  quantity: z.coerce.number().positive("Enter a quantity"),
  unit: z.string(),
  quality: z.string(),
  targetPrice: z
    .union([z.literal(""), z.coerce.number().positive()])
    .optional(),
  requiredDate: z.string().min(1, "Choose a date"),
  location: z.string().min(3),
  transport: z.string(),
  packaging: z.string().min(3),
  allowPartial: z.boolean(),
  minFillPercent: z.coerce.number().min(1).max(100),
  recurring: z.boolean(),
  notes: z.string().max(1000).optional(),
});
const counterSchema = z.object({
  pricePerUnit: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  deliveryDate: z.string(),
  transportCost: z.coerce.number().min(0),
  paymentTerms: z.string().min(2),
  message: z.string().optional(),
});
const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {error && (
      <span className="mt-1.5 block text-xs font-medium text-red-600">
        {error}
      </span>
    )}
  </label>
);

export function BulkHomePage() {
  const { data: bootstrap, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getData(api.get("/bootstrap")),
  });
  const requirements = bootstrap?.requirements || [],
    quotes = bootstrap?.quotations || [],
    orders = bootstrap?.orders?.filter((o) => o.type === "BULK") || [];
  return (
    <div className="container-page py-10">
      <div className="relative mb-9 overflow-hidden rounded-[28px] bg-forest-950 px-7 py-10 text-white sm:px-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(167,214,91,.18),transparent_65%)]" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-lime-300">
              Business procurement
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
              Bulk sourcing, made accountable.
            </h1>
            <p className="mt-4 max-w-2xl text-forest-100/70">
              Source directly from verified farmers and FPOs. Compare structured
              offers, combine supply, negotiate clear terms and follow
              fulfilment.
            </p>
          </div>
          <Link
            to="/bulk/new"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-lime-300 px-6 font-bold text-forest-950 hover:bg-lime-200"
          >
            <Plus className="h-4 w-4" />
            Post new requirement
          </Link>
        </div>
      </div>
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Active requirements"
              value={
                requirements.filter(
                  (r) => !["CLOSED", "ACCEPTED"].includes(r.status),
                ).length
              }
              detail="Across 5 commodities"
              icon={Scale}
            />
            <MetricCard
              label="Quotes received"
              value={quotes.length}
              detail={`${quotes.filter((q) => q.status === "NEGOTIATING").length} in negotiation`}
              icon={MessageSquareMore}
              tone="violet"
            />
            <MetricCard
              label="Orders in progress"
              value={orders.filter((o) => o.status !== "DELIVERED").length}
              detail="1 consolidated shipment"
              icon={Truck}
              tone="blue"
            />
            <MetricCard
              label="Monthly purchase value"
              value="₹3.46L"
              detail="↑ 10.9% from July"
              icon={BarChart3}
              tone="amber"
            />
          </div>
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="section-title">Active requirements</h2>
              <Link to="/recurring-procurement" className="btn-secondary">
                <RefreshCcw className="h-4 w-4" />
                Recurring plans
              </Link>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {requirements.map((r) => (
                <RequirementCard key={r._id} requirement={r} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
function RequirementCard({ requirement: r, sellerView = false }) {
  return (
    <article className="card card-hover p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <span className="text-xs font-semibold text-gray-400">
              {r._id.toUpperCase()}
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-bold">
            {number(r.quantity)}
            {r.unit} {r.product}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {sellerView ? r.buyer : `Grade ${r.quality} · ${r.packaging}`}
          </p>
        </div>
        <div className="rounded-2xl bg-forest-50 px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            Target
          </p>
          <p className="font-display font-bold text-forest-800">
            {r.targetPrice ? `${money(r.targetPrice)}/${r.unit}` : "Open"}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-cream p-4 text-xs text-gray-600 sm:grid-cols-4">
        <span>
          <CalendarDays className="mb-1 h-4 w-4 text-forest-600" />
          Due {shortDate(r.requiredDate)}
        </span>
        <span>
          <MapPin className="mb-1 h-4 w-4 text-forest-600" />
          {r.location}
        </span>
        <span>
          <UsersRound className="mb-1 h-4 w-4 text-forest-600" />
          {r.allowPartial ? "Multi-seller" : "Single seller"}
        </span>
        <span>
          <MessageSquareMore className="mb-1 h-4 w-4 text-forest-600" />
          {r.quotationsCount || 0} quotations
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Posted {relative(r.createdAt)}
        </span>
        {sellerView ? (
          <span className="text-xs font-semibold text-forest-700">
            Quote from your seller workspace
          </span>
        ) : (
          <Link
            to={`/bulk/${r._id}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-forest-700"
          >
            View requirement <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function NewRequirementPage() {
  const navigate = useNavigate();
  const selectedLocation = useAppStore((state) => state.location);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      product: "Fresh Desi Tomato",
      category: "Vegetables",
      unit: "kg",
      quality: "A",
      transport: "Either",
      packaging: "Ventilated crates",
      allowPartial: true,
      minFillPercent: 80,
      recurring: false,
      location: selectedLocation === "India" ? "" : selectedLocation,
    },
  });
  const recurring = watch("recurring");
  const submit = async (values) => {
    try {
      const data = await getData(
        api.post("/bulk-requirements", {
          ...values,
          productId: {
            "Fresh Desi Tomato": "prod-tomato",
            "Jyoti Potato": "prod-potato",
            "Nasik Red Onion": "prod-onion",
            "Aromatic Gobindobhog Rice": "prod-rice",
          }[values.product],
          targetPrice: values.targetPrice || undefined,
        }),
      );
      toast.success("Requirement published", {
        description: "Matching verified farmers and FPOs can now respond.",
      });
      navigate(`/bulk/${data._id}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  return (
    <div className="container-page max-w-5xl py-10">
      <Link
        to="/bulk"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Bulk procurement
      </Link>
      <PageHeader
        eyebrow="New sourcing request"
        title="Post bulk requirement"
        description="Receive structured price offers from verified farmers and FPOs. Details remain editable until negotiation begins."
      />
      <form
        onSubmit={handleSubmit(submit)}
        className="grid gap-6 lg:grid-cols-[1fr_300px]"
      >
        <section className="card space-y-6 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Product" error={errors.product?.message}>
              <select className="input" {...register("product")}>
                <option>Fresh Desi Tomato</option>
                <option>Jyoti Potato</option>
                <option>Nasik Red Onion</option>
                <option>Aromatic Gobindobhog Rice</option>
                <option>Green Chili</option>
              </select>
            </Field>
            <Field label="Category">
              <select className="input" {...register("category")}>
                <option>Vegetables</option>
                <option>Fruits</option>
                <option>Grains</option>
                <option>Spices</option>
              </select>
            </Field>
            <Field label="Quantity required" error={errors.quantity?.message}>
              <div className="flex">
                <input
                  type="number"
                  className="input rounded-r-none"
                  placeholder="2,000"
                  {...register("quantity")}
                />
                <select
                  className="input w-24 rounded-l-none border-l-0"
                  {...register("unit")}
                >
                  <option>kg</option>
                  <option>tonne</option>
                  <option>piece</option>
                </select>
              </div>
            </Field>
            <Field label="Quality grade">
              <select className="input" {...register("quality")}>
                <option>A</option>
                <option>Premium</option>
                <option>B</option>
              </select>
            </Field>
            <Field label="Indicative target price (optional)">
              <div className="relative">
                <IndianRupee className="absolute left-4 top-4 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  step="0.1"
                  className="input pl-10"
                  placeholder="26 per kg"
                  {...register("targetPrice")}
                />
              </div>
            </Field>
            <Field
              label="Required delivery date"
              error={errors.requiredDate?.message}
            >
              <input
                type="date"
                className="input"
                min="2026-08-24"
                {...register("requiredDate")}
              />
            </Field>
            <Field label="Delivery location" error={errors.location?.message}>
              <input className="input" {...register("location")} />
            </Field>
            <Field label="Transport preference">
              <select className="input" {...register("transport")}>
                <option>Either</option>
                <option>Seller arranged</option>
                <option>Buyer pickup</option>
              </select>
            </Field>
          </div>
          <Field
            label="Packaging requirement"
            error={errors.packaging?.message}
          >
            <input
              className="input"
              placeholder="e.g. 20kg ventilated crates"
              {...register("packaging")}
            />
          </Field>
          <Field label="Additional notes">
            <textarea
              className="textarea"
              placeholder="Delivery window, acceptable size tolerance or handling notes…"
              {...register("notes")}
            />
          </Field>
          <div className="rounded-2xl border border-forest-200 bg-forest-50 p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-forest-700"
                {...register("allowPartial")}
              />
              <span>
                <strong className="block text-sm text-forest-900">
                  Allow partial fulfilment from multiple suppliers
                </strong>
                <span className="mt-1 block text-xs leading-5 text-forest-700">
                  Kishan Bhaiya may suggest a transparent combination when one
                  seller cannot cover the full amount.
                </span>
              </span>
            </label>
            <div className="mt-4 pl-7">
              <label className="label">Minimum accepted fill percentage</label>
              <input
                type="number"
                className="input max-w-32"
                {...register("minFillPercent")}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-5">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-forest-700"
              {...register("recurring")}
            />
            <span>
              <strong className="block text-sm">Make this recurring</strong>
              <span className="mt-1 block text-xs text-gray-500">
                Generate upcoming procurement instances without re-entering the
                same need.
              </span>
            </span>
          </label>
          {recurring && (
            <div className="grid gap-4 rounded-2xl bg-cream p-5 sm:grid-cols-2">
              <Field label="Frequency">
                <select className="input">
                  <option>Weekly</option>
                  <option>Biweekly</option>
                  <option>Monthly</option>
                </select>
              </Field>
              <Field label="Preferred weekday">
                <select className="input">
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Friday</option>
                </select>
              </Field>
            </div>
          )}
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <InlineLoader label="Publishing…" />
            ) : (
              <>
                Post requirement <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <Sparkles className="h-5 w-5 text-forest-700" />
            <h3 className="mt-3 font-display font-bold">What happens next?</h3>
            <ol className="mt-4 space-y-4">
              {[
                "Compatible verified sellers are matched",
                "Offers arrive as structured terms",
                "Compare landed cost and reliability",
                "Accept only when terms work for you",
              ].map((x, i) => (
                <li
                  key={x}
                  className="flex gap-3 text-xs leading-5 text-gray-600"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-100 font-bold text-forest-700">
                    {i + 1}
                  </span>
                  {x}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 text-xs leading-5 text-amber-800">
            <strong className="block">Private by design</strong>Demand board
            summaries are aggregated. Your contact details remain private before
            an eligible interaction.
          </div>
        </aside>
      </form>
    </div>
  );
}

export function RequirementDetailsPage() {
  const { id } = useParams(),
    navigate = useNavigate();
  const {
    data: r,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["requirement", id],
    queryFn: () => getData(api.get(`/bulk-requirements/${id}`)),
  });
  const { data: matches } = useQuery({
    queryKey: ["matches", id],
    queryFn: () => getData(api.get(`/bulk-requirements/${id}/matches`)),
    enabled: Boolean(r) && !r.acceptedOrderId,
  });
  const acceptPlan = useMutation({
    mutationFn: () =>
      getData(api.post(`/bulk-requirements/${id}/fulfillment-plans/accept`)),
    onSuccess: (o) => {
      toast.success("Multi-seller plan accepted", {
        description: "Seller suborders were created under one buyer order.",
      });
      navigate(`/orders/${o._id}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });
  if (isLoading)
    return (
      <div className="container-page py-10">
        <LoadingState cards={3} />
      </div>
    );
  if (error)
    return (
      <div className="container-page py-10">
        <ErrorState message="Requirement not found." />
      </div>
    );
  return (
    <div className="container-page py-10">
      <Link
        to="/bulk"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Bulk procurement
      </Link>
      <PageHeader
        eyebrow={r._id.toUpperCase()}
        title={`${number(r.quantity)}${r.unit} ${r.product}`}
        description={`Required in ${r.location} by ${shortDate(r.requiredDate)} · Grade ${r.quality}`}
        actions={
          <>
            <StatusBadge status={r.status} />
            <Link to={`/bulk/${r._id}/quotations`} className="btn-primary">
              Compare {r.quotationsCount || 0} offers{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_370px]">
        <div className="space-y-6">
          {r.acceptedOrderId ? (
            <section className="card border-forest-200 bg-forest-50 p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="eyebrow">Fulfilment locked</p>
                  <h2 className="mt-2 font-display text-xl font-bold">
                    This supplier split has been accepted
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Reserved lots and automatic shipment trips are preserved on the buyer order. Accepting again will not create duplicates.
                  </p>
                  {r.acceptedSplitSummary && (
                    <p className="mt-3 text-xs font-bold text-forest-700">
                      {r.acceptedSplitSummary.supplierCount} suppliers · {r.acceptedSplitSummary.shipmentCount} trips · {r.acceptedSplitSummary.autoDispatchedCount} auto-dispatched
                    </p>
                  )}
                </div>
                <Link to={`/orders/${r.acceptedOrderId}`} className="btn-primary shrink-0">
                  View fulfilment <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : (
          <>
          <section className="card p-6">
            <h2 className="font-display text-xl font-bold">
              Requirement details
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  "Target price",
                  r.targetPrice
                    ? `${money(r.targetPrice)}/${r.unit}`
                    : "Open to offers",
                ],
                ["Packaging", r.packaging],
                ["Transport", r.transport],
                ["Multi-seller", r.allowPartial ? "Allowed" : "Not allowed"],
                ["Minimum fill", `${r.minFillPercent}%`],
                ["Recurring", r.recurring ? "Yes" : "No"],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs text-gray-500">{term}</dt>
                  <dd className="mt-1 text-sm font-bold">
                    {value || "Not specified"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Transparent matching</p>
                <h2 className="mt-2 font-display text-xl font-bold">
                  Suggested fulfilment plan
                </h2>
              </div>
              <span className="badge bg-violet-50 text-violet-700">
                <SlidersHorizontal className="h-3 w-3" />
                Weighted rules
              </span>
            </div>
            {matches?.plan ? (
              <>
                <div className="mt-5 rounded-2xl bg-forest-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-forest-100/60">
                        Quantity covered
                      </p>
                      <p className="mt-1 font-display text-3xl font-bold">
                        {number(matches.plan.filledQuantity)} /{" "}
                        {number(matches.plan.requestedQuantity)}
                        {r.unit}
                      </p>
                    </div>
                    <p className="font-display text-3xl font-bold text-lime-300">
                      {matches.plan.coveragePercent}%
                    </p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-lime-300"
                      style={{ width: `${matches.plan.coveragePercent}%` }}
                    />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-forest-100/65">
                    {matches.plan.method}. Route and landed cost are estimates.
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {matches.plan.allocations.map((a, i) => (
                    <div
                      key={a.sellerId}
                      className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-50 text-sm font-bold text-forest-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold">
                            {a.seller?.name}
                          </p>
                          <VerifiedBadge compact />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {a.distance} km · {a.seller?.reliability || 92}%
                          reliable · score {a.score}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold">
                          {number(a.quantity)}
                          {r.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          @ {money(a.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {r.allowPartial && matches.plan.allocations.length > 1 && (
                  <button
                    className="btn-primary mt-5 w-full"
                    onClick={() => acceptPlan.mutate()}
                    disabled={acceptPlan.isPending}
                  >
                    {acceptPlan.isPending ? (
                      <InlineLoader label="Reserving supply…" />
                    ) : (
                      "Accept combined fulfilment plan"
                    )}
                  </button>
                )}
              </>
            ) : (
              <div className="mt-6">
                <LoadingState cards={2} />
              </div>
            )}
          </section>
          </>
          )}
        </div>
        <aside className="space-y-5">
          <section className="card p-6">
            <h2 className="font-display text-lg font-bold">
              Quotation progress
            </h2>
            <div className="mt-5">
              <Progress
                value={Math.min(100, (r.quotationsCount || 0) * 25)}
                label={`${r.quotationsCount || 0} offers received`}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-cream p-4">
                <p className="font-display text-2xl font-bold">
                  {r.quotationsCount || 0}
                </p>
                <p className="text-xs text-gray-500">Total offers</p>
              </div>
              <div className="rounded-2xl bg-cream p-4">
                <p className="font-display text-2xl font-bold">
                  {r.acceptedSplitSummary?.supplierCount || matches?.candidates?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Matched sellers</p>
              </div>
            </div>
            <Link
              to={`/bulk/${r._id}/quotations`}
              className="btn-primary mt-5 w-full"
            >
              View quotations
            </Link>
          </section>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-5 text-amber-800">
            <strong className="block">Indicative comparison</strong>The matching
            score is transparent operational guidance, not an automated
            acceptance or guaranteed outcome.
          </div>
        </aside>
      </div>
    </div>
  );
}

export function QuotationsPage() {
  const { id } = useParams(),
    [sort, setSort] = useState("recommended");
  const { data: r } = useQuery({
    queryKey: ["requirement", id],
    queryFn: () => getData(api.get(`/bulk-requirements/${id}`)),
  });
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => getData(api.get(`/bulk-requirements/${id}/quotations`)),
  });
  const sorted = [...quotes].sort(
    sort === "price"
      ? (a, b) => a.pricePerUnit - b.pricePerUnit
      : sort === "delivery"
        ? (a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate)
        : sort === "rating"
          ? (a, b) => b.seller.rating - a.seller.rating
          : (a, b) => (b.seller.reliability || 0) - (a.seller.reliability || 0),
  );
  return (
    <div className="container-page py-10">
      <Link
        to={`/bulk/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Requirement details
      </Link>
      <PageHeader
        eyebrow={
          r ? `${r._id.toUpperCase()} · ${r.product}` : "Quotation comparison"
        }
        title="Compare seller offers"
        description="Review price together with transport, delivery, quality and platform reliability—never price alone."
        actions={
          <select
            className="input w-52"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="price">Lowest price</option>
            <option value="delivery">Fastest delivery</option>
            <option value="rating">Top rated</option>
          </select>
        }
      />
      {isLoading ? (
        <LoadingState cards={3} />
      ) : sorted.length ? (
        <div className="grid gap-5 xl:grid-cols-3">
          {sorted.map((q, i) => (
            <article
              key={q._id}
              className={`card relative overflow-hidden p-6 ${i === 0 ? "border-forest-300 ring-2 ring-forest-100" : ""}`}
            >
              {i === 0 && (
                <div className="absolute right-0 top-0 rounded-bl-2xl bg-forest-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white">
                  Recommended
                </div>
              )}
              <div className="flex gap-3">
                <img
                  src={q.seller?.image}
                  alt=""
                  className="h-12 w-12 rounded-2xl object-cover"
                />
                <div>
                  <h2 className="font-display font-bold">{q.seller?.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <VerifiedBadge compact />
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                      <Star className="h-3 w-3 fill-current" />
                      {q.seller?.rating}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-cream p-5">
                <p className="text-xs text-gray-500">Price offered</p>
                <p className="mt-1 font-display text-3xl font-extrabold text-forest-900">
                  {money(q.pricePerUnit)}
                  <span className="text-sm font-medium text-gray-500">
                    /{r?.unit || "kg"}
                  </span>
                </p>
                <p className="mt-2 text-xs font-semibold text-gray-600">
                  Estimated total{" "}
                  {money(q.pricePerUnit * q.quantity + q.transportCost)}
                </p>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Quantity", `${number(q.quantity)}${r?.unit || "kg"}`],
                  ["Delivery", shortDate(q.deliveryDate)],
                  [
                    "Transport",
                    q.transportIncluded ? "Included" : money(q.transportCost),
                  ],
                  ["Payment", q.paymentTerms],
                  ["Valid until", shortDate(q.validUntil)],
                ].map(([a, b]) => (
                  <div key={a} className="flex justify-between gap-4">
                    <dt className="text-gray-500">{a}</dt>
                    <dd className="text-right font-semibold">{b}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                {q.note}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Link to={`/negotiation/${q._id}`} className="btn-secondary">
                  Counter offer
                </Link>
                <Link to={`/negotiation/${q._id}`} className="btn-primary">
                  Review & accept
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No quotations yet"
          description="Matched farmers and FPOs have been notified. New offers will appear here in real time."
        />
      )}
    </div>
  );
}

export function NegotiationPage() {
  const { quotationId } = useParams(),
    navigate = useNavigate(),
    queryClient = useQueryClient(),
    [counterOpen, setCounterOpen] = useState(false),
    [acceptOpen, setAcceptOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: () => getData(api.get(`/quotations/${quotationId}`)),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(counterSchema) });
  const counter = useMutation({
    mutationFn: (v) =>
      getData(api.post(`/quotations/${quotationId}/counter`, v)),
    onSuccess: () => {
      toast.success("Counter offer sent");
      setCounterOpen(false);
      queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const accept = useMutation({
    mutationFn: () => getData(api.post(`/quotations/${quotationId}/accept`)),
    onSuccess: (o) => {
      toast.success("Offer accepted and inventory reserved");
      navigate(`/orders/${o._id}`);
    },
    onError: (e) => {
      toast.error(apiError(e));
      setAcceptOpen(false);
    },
  });
  if (isLoading)
    return (
      <div className="container-page py-10">
        <LoadingState cards={2} />
      </div>
    );
  if (error)
    return (
      <div className="container-page py-10">
        <ErrorState message="Negotiation not found." />
      </div>
    );
  const { quote, negotiation, requirement } = data,
    offers = negotiation?.offers?.length
      ? negotiation.offers
      : [
          {
            id: "initial",
            sender: quote.seller?.name,
            senderRole: "seller",
            pricePerUnit: quote.pricePerUnit,
            quantity: quote.quantity,
            deliveryDate: quote.deliveryDate,
            transportCost: quote.transportCost,
            paymentTerms: quote.paymentTerms,
            message: quote.note,
            createdAt: quote.createdAt,
            current: true,
          },
        ],
    current = offers.at(-1);
  const openCounter = () => {
    reset({
      pricePerUnit: current.pricePerUnit,
      quantity: current.quantity,
      deliveryDate: String(current.deliveryDate).slice(0, 10),
      transportCost: current.transportCost || 0,
      paymentTerms: current.paymentTerms,
      message: "",
    });
    setCounterOpen(true);
  };
  return (
    <div className="container-page max-w-6xl py-10">
      <Link
        to={`/bulk/${quote.requirementId}/quotations`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
      >
        <ChevronLeft className="h-4 w-4" />
        All quotations
      </Link>
      <PageHeader
        eyebrow={`${requirement._id.toUpperCase()} · Structured negotiation`}
        title={quote.seller?.name}
        description={`${number(requirement.quantity)}${requirement.unit} ${requirement.product} required in ${requirement.location}`}
        actions={
          <>
            <VerifiedBadge />
            <StatusBadge status={negotiation?.status || quote.status} />
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold">Offer history</h2>
          <p className="mt-2 text-sm text-gray-500">
            Every revision is immutable and timestamped. The latest valid offer
            appears highlighted.
          </p>
          <div className="mt-7 space-y-4">
            {offers.map((offer, i) => (
              <article
                key={offer.id || i}
                className={`relative rounded-[20px] border p-5 ${i === offers.length - 1 ? "border-forest-300 bg-forest-50/60 ring-2 ring-forest-100" : "border-gray-200 bg-white"}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{offer.sender}</p>
                      <span
                        className={`badge ${offer.senderRole === "buyer" ? "bg-blue-50 text-blue-700" : "bg-forest-100 text-forest-700"}`}
                      >
                        {offer.senderRole}
                      </span>
                      {i === offers.length - 1 && (
                        <span className="badge bg-amber-100 text-amber-800">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {relative(offer.createdAt)}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-extrabold text-forest-900">
                    {money(offer.pricePerUnit)}
                    <span className="text-xs font-medium text-gray-500">
                      /{requirement.unit}
                    </span>
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-white/80 p-4 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-gray-400">Quantity</span>
                    <strong className="mt-1 block">
                      {number(offer.quantity)}
                      {requirement.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Delivery</span>
                    <strong className="mt-1 block">
                      {shortDate(offer.deliveryDate)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Transport</span>
                    <strong className="mt-1 block">
                      {offer.transportCost
                        ? money(offer.transportCost)
                        : "Included"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400">Payment</span>
                    <strong className="mt-1 block">{offer.paymentTerms}</strong>
                  </div>
                </div>
                {offer.message && (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    “{offer.message}”
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
        <aside className="card sticky top-24 overflow-hidden">
          <div className="bg-forest-950 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-lime-300">
              Current offer
            </p>
            <p className="mt-3 font-display text-4xl font-extrabold">
              {money(current.pricePerUnit)}
              <span className="text-sm font-medium text-forest-100/60">
                /{requirement.unit}
              </span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-white/10 p-3">
                <span className="text-forest-100/60">Quantity</span>
                <strong className="mt-1 block text-sm">
                  {number(current.quantity)}
                  {requirement.unit}
                </strong>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <span className="text-forest-100/60">Landed total</span>
                <strong className="mt-1 block text-sm">
                  {money(
                    current.pricePerUnit * current.quantity +
                      (current.transportCost || 0),
                  )}
                </strong>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-6">
            <button
              className="btn-primary w-full"
              onClick={() => setAcceptOpen(true)}
              disabled={quote.status === "ACCEPTED"}
            >
              <Check className="h-4 w-4" />
              {quote.status === "ACCEPTED" ? "Offer accepted" : "Accept offer"}
            </button>
            <button
              className="btn-secondary w-full"
              onClick={openCounter}
              disabled={quote.status === "ACCEPTED"}
            >
              <MessageSquareMore className="h-4 w-4" />
              Counter offer
            </button>
            <button
              className="btn-ghost w-full text-red-600"
              disabled={quote.status === "ACCEPTED"}
            >
              Reject offer
            </button>
            <p className="pt-2 text-center text-[11px] leading-5 text-gray-500">
              Accepting locks this negotiation, reserves inventory and creates
              an order snapshot.
            </p>
          </div>
        </aside>
      </div>
      <Modal
        open={counterOpen}
        onClose={() => setCounterOpen(false)}
        title="Send counter offer"
      >
        <form
          id="counter-form"
          onSubmit={handleSubmit((v) => counter.mutate(v))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label={`Price per ${requirement.unit}`}>
            <input
              type="number"
              step="0.1"
              className="input"
              {...register("pricePerUnit")}
            />
          </Field>
          <Field label="Quantity">
            <input type="number" className="input" {...register("quantity")} />
          </Field>
          <Field label="Delivery date">
            <input
              type="date"
              className="input"
              {...register("deliveryDate")}
            />
          </Field>
          <Field label="Transport cost">
            <input
              type="number"
              className="input"
              {...register("transportCost")}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Payment terms">
              <input className="input" {...register("paymentTerms")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Short message">
              <textarea className="textarea" {...register("message")} />
            </Field>
          </div>
          <button
            className="btn-primary sm:col-span-2"
            disabled={isSubmitting || counter.isPending}
          >
            {counter.isPending ? (
              <InlineLoader label="Sending…" />
            ) : (
              "Send counter offer"
            )}
          </button>
        </form>
      </Modal>
      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept this offer?"
      >
        <div className="rounded-2xl bg-forest-50 p-5">
          <p className="text-sm text-gray-600">You are accepting</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {number(current.quantity)}
            {requirement.unit} at {money(current.pricePerUnit)}/
            {requirement.unit}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Estimated total{" "}
            {money(
              current.pricePerUnit * current.quantity +
                (current.transportCost || 0),
            )}
          </p>
        </div>
        <ul className="mt-5 space-y-3 text-sm text-gray-600">
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-forest-600" />
            Negotiation will be locked
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-forest-600" />
            Available inventory will be reserved
          </li>
          <li className="flex gap-2">
            <Check className="h-4 w-4 text-forest-600" />
            An order will be created with these exact terms
          </li>
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            className="btn-secondary flex-1"
            onClick={() => setAcceptOpen(false)}
          >
            Keep reviewing
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
          >
            {accept.isPending ? (
              <InlineLoader label="Reserving…" />
            ) : (
              "Accept & create order"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export { RequirementCard };
