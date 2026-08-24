import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  CloudOff,
  Edit3,
  Eye,
  IndianRupee,
  Mic,
  MoreHorizontal,
  PackageOpen,
  Plus,
  Save,
  Send,
  ShoppingBag,
  Truck,
  UsersRound,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import {
  EmptyState,
  InlineLoader,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  Progress,
  StatusBadge,
} from "../components/UI.jsx";
import { RequirementCard } from "./BulkPages.jsx";
import { PageMotion, Stagger, StaggerItem } from "../components/Motion.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { saveListingDraft } from "../data/offlineDb.js";
import { money, number, relative, shortDate } from "../utils/format.js";

export function SellerDashboardPage() {
  const user = useAppStore((s) => s.user);
  const { data: b, isLoading } = useQuery({
    queryKey: ["bootstrap", user?._id],
    queryFn: () => getData(api.get("/bootstrap")),
  });
  const { data: a } = useQuery({
    queryKey: ["analytics", user?._id],
    queryFn: () => getData(api.get("/analytics/overview")),
  });
  if (isLoading) return <LoadingState />;
  const seller = b.workspace?.seller;
  const products = b.products.filter((p) => p.sellerId === seller?.id);
  const low = products.filter((p) => p.availableQuantity < 300);
  return (
    <PageMotion kind="operations">
      <PageHeader
        eyebrow="Producer overview"
        title={`Good morning, ${user?.name?.split(" ")[0] || "Mahesh"}`}
        description="Here’s what needs attention across inventory, demand and fulfilment today."
        actions={
          <Link className="btn-primary" to="/seller/products/new">
            <Plus className="h-4 w-4" />
            Add produce
          </Link>
        }
      />
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" kind="operations">
        <StaggerItem kind="operations"><MetricCard
          label="Revenue"
          value={money(a?.revenue || 0)}
          detail="This month"
          icon={IndianRupee}
        /></StaggerItem>
        <StaggerItem kind="operations"><MetricCard
          label="Orders"
          value={b.orders.length}
          detail={`${b.orders.filter((order) => !["DELIVERED", "COMPLETED"].includes(order.status)).length} need action`}
          icon={ShoppingBag}
          tone="blue"
        /></StaggerItem>
        <StaggerItem kind="operations"><MetricCard
          label="Inventory"
          value={`${number(products.reduce((n, p) => n + p.availableQuantity, 0))}kg`}
          detail={`${products.length} live listings`}
          icon={Boxes}
        /></StaggerItem>
        <StaggerItem kind="operations"><MetricCard
          label="New requirements"
          value={
            b.requirements.filter((r) =>
              ["OPEN", "MATCHING"].includes(r.status),
            ).length
          }
          detail="Matched to your crops"
          icon={ClipboardList}
          tone="violet"
        /></StaggerItem>
        <StaggerItem kind="operations"><MetricCard
          label="Shipments"
          value={b.shipments.filter((s) => s.status !== "DELIVERED").length}
          detail={`${b.shipments.filter((shipment) => shipment.status === "DELAYED").length} delayed`}
          icon={Truck}
          tone="amber"
        /></StaggerItem>
      </Stagger>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Business performance</p>
              <h2 className="mt-2 font-display text-xl font-bold">
                Revenue trend
              </h2>
            </div>
            <span className="badge bg-forest-50 text-forest-700">+12.4%</span>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a?.monthly || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#edf0ed"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip
                  formatter={(v) => money(v)}
                  cursor={{ fill: "#eff7f2" }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#256d4a"
                  radius={[8, 8, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Needs attention</h2>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {low.length ? (
              low.slice(0, 3).map((p) => (
                <Link
                  key={p._id}
                  to="/seller/products"
                  className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-forest-50"
                >
                  <img
                    src={p.image}
                    alt=""
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{p.name}</p>
                    <p className="text-xs text-amber-700">
                      Only {p.availableQuantity}
                      {p.unit} available
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                Inventory levels look healthy.
              </p>
            )}
            <Link
              to="/surplus"
              className="flex items-center justify-between rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              <span>{b.lots.filter((lot) => lot.freshnessState === "SELL_SOON").length} urgent sell-soon lots</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
      <section className="mt-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="section-title">New demand near you</h2>
          <Link to="/seller/bulk-requests" className="btn-ghost">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {b.requirements.slice(0, 2).map((r) => (
            <RequirementCard key={r._id} requirement={r} sellerView />
          ))}
        </div>
      </section>
    </PageMotion>
  );
}

export function SellerProductsPage() {
  const user = useAppStore((s) => s.user);
  const { data: bootstrap, isLoading } = useQuery({
    queryKey: ["bootstrap", user?._id],
    queryFn: () => getData(api.get("/bootstrap")),
  });
  const mine = bootstrap?.products || [];
  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products & live lots"
        description="Keep published stock, wholesale thresholds, grades and freshness current."
        actions={
          <Link to="/seller/products/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        }
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="table-shell">
          <table className="desktop-table w-full text-left">
            <thead className="bg-cream text-xs uppercase tracking-wider text-gray-500">
              <tr>
                {[
                  "Product",
                  "Available",
                  "Retail / Bulk",
                  "Quality",
                  "Harvest",
                  "Status",
                  "",
                ].map((x) => (
                  <th key={x} className="px-5 py-4 font-semibold">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mine.map((p) => (
                <tr key={p._id} className="hover:bg-forest-50/30">
                  <td data-label="Product" className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td
                    data-label="Available"
                    className="px-5 py-4 text-sm font-bold"
                  >
                    {number(p.availableQuantity)}
                    {p.unit}
                  </td>
                  <td data-label="Retail / Bulk" className="px-5 py-4 text-sm">
                    <strong>{money(p.retailPrice)}</strong>
                    <span className="block text-xs text-gray-500">
                      {money(p.bulkPrice)} from {p.bulkThreshold}
                      {p.unit}
                    </span>
                  </td>
                  <td data-label="Quality" className="px-5 py-4">
                    <span className="badge bg-forest-50 text-forest-700">
                      Grade {p.grade}
                    </span>
                  </td>
                  <td
                    data-label="Harvest"
                    className="px-5 py-4 text-sm text-gray-600"
                  >
                    {shortDate(p.harvestDate)}
                  </td>
                  <td data-label="Status" className="px-5 py-4">
                    <StatusBadge status={p.status?.toUpperCase()} />
                  </td>
                  <td data-label="Actions" className="px-5 py-4">
                    <button className="btn-ghost h-9 w-9 p-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const productSchema = z.object({
  name: z.string().min(2),
  category: z.string(),
  description: z.string().min(10),
  image: z.string().optional(),
  retailPrice: z.coerce.number().positive(),
  bulkPrice: z.coerce.number().positive(),
  availableQuantity: z.coerce.number().min(0),
  minimumOrder: z.coerce.number().positive(),
  bulkThreshold: z.coerce.number().positive(),
  grade: z.string(),
  harvestDate: z.string(),
  shelfLifeDays: z.coerce.number().positive(),
  organic: z.boolean(),
  locationName: z.string().min(2),
  packaging: z.string().min(2),
});
export function ProductFormPage() {
  const navigate = useNavigate(),
    [listening, setListening] = useState(false),
    [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "Vegetables",
      description: "",
      retailPrice: 30,
      bulkPrice: 26,
      availableQuantity: 500,
      minimumOrder: 1,
      bulkThreshold: 100,
      grade: "A",
      shelfLifeDays: 8,
      organic: false,
      locationName: "Khordha",
      packaging: "Ventilated crates",
    },
  });
  const submit = async (values) => {
    try {
      const data = await getData(api.post("/products", values));
      toast.success(`${data.name} is live`);
      navigate("/seller/products");
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const draft = async () => {
    await saveListingDraft(getValues());
    toast.success("Draft saved on this device", {
      description: navigator.onLine
        ? "Ready to finish later."
        : "Sync pending until you are online.",
    });
  };
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    setUploading(true);
    try {
      const data = await getData(api.post("/uploads", body));
      setValue("image", data.url, { shouldDirty: true });
      toast.success(`Image uploaded with ${data.provider}`);
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setUploading(false);
    }
  };
  const voice = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      toast.info("Voice entry is not supported in this browser");
      return;
    }
    const r = new Speech();
    r.lang = "en-IN";
    setListening(true);
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const qty = text.match(/(\d+)\s*(kg|kilogram)/i);
      const crop = ["tomato", "potato", "onion", "mango", "rice"].find((c) =>
        text.toLowerCase().includes(c),
      );
      if (qty) setValue("availableQuantity", Number(qty[1]));
      if (crop) setValue("name", crop[0].toUpperCase() + crop.slice(1));
      toast.success("Voice details captured", {
        description: "Review the editable fields before publishing.",
      });
    };
    r.onend = () => setListening(false);
    r.start();
  };
  return (
    <>
      <PageHeader
        eyebrow="Simple listing"
        title="Add fresh produce"
        description="Capture the essentials now. Every value remains editable before you publish."
        actions={
          <button className="btn-secondary" onClick={voice}>
            <Mic
              className={`h-4 w-4 ${listening ? "animate-pulse text-red-500" : ""}`}
            />
            {listening ? "Listening…" : "Speak details"}
          </button>
        }
      />
      <form
        onSubmit={handleSubmit(submit)}
        className="grid items-start gap-6 xl:grid-cols-[1fr_320px]"
      >
        <section className="card p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Product name" error={errors.name?.message}>
              <input
                className="input"
                placeholder="e.g. Fresh tomato"
                {...register("name")}
              />
            </FormField>
            <FormField label="Category">
              <select className="input" {...register("category")}>
                <option>Vegetables</option>
                <option>Fruits</option>
                <option>Grains</option>
                <option>Pulses</option>
                <option>Spices</option>
              </select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label="Description"
                error={errors.description?.message}
              >
                <textarea
                  className="textarea"
                  placeholder="Tell buyers about variety, harvest and handling…"
                  {...register("description")}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Image URL (optional)">
                <input
                  className="input"
                  placeholder="Uses a produce fallback when empty"
                  {...register("image")}
                />
              </FormField>
              <label className="btn-secondary mt-3 cursor-pointer">
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadImage}
                  disabled={uploading}
                />
                {uploading ? <InlineLoader label="Uploading…" /> : "Upload produce image"}
              </label>
              <p className="mt-2 text-xs text-gray-500">JPG, PNG or WebP · maximum 5 MB</p>
            </div>
            <FormField label="Retail price / kg">
              <input
                type="number"
                className="input"
                {...register("retailPrice")}
              />
            </FormField>
            <FormField label="Bulk price / kg">
              <input
                type="number"
                className="input"
                {...register("bulkPrice")}
              />
            </FormField>
            <FormField label="Available quantity (kg)">
              <input
                type="number"
                className="input"
                {...register("availableQuantity")}
              />
            </FormField>
            <FormField label="Minimum order (kg)">
              <input
                type="number"
                className="input"
                {...register("minimumOrder")}
              />
            </FormField>
            <FormField label="Bulk threshold (kg)">
              <input
                type="number"
                className="input"
                {...register("bulkThreshold")}
              />
            </FormField>
            <FormField label="Quality grade">
              <select className="input" {...register("grade")}>
                <option>A</option>
                <option>Premium</option>
                <option>B</option>
              </select>
            </FormField>
            <FormField label="Harvest date">
              <input
                type="date"
                className="input"
                {...register("harvestDate")}
              />
            </FormField>
            <FormField label="Expected shelf life (days)">
              <input
                type="number"
                className="input"
                {...register("shelfLifeDays")}
              />
            </FormField>
            <FormField label="Farm / FPO location">
              <input className="input" {...register("locationName")} />
            </FormField>
            <FormField label="Packaging type">
              <input className="input" {...register("packaging")} />
            </FormField>
            <label className="flex items-center gap-3 rounded-2xl bg-forest-50 p-4 text-sm font-bold text-forest-800 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-forest-700"
                {...register("organic")}
              />
              Organic / certified practice declaration
            </label>
          </div>
          <div className="mt-7 flex flex-col gap-3 border-t pt-6 sm:flex-row">
            <button className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <InlineLoader label="Publishing…" />
              ) : (
                <>
                  Publish product <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <button type="button" className="btn-secondary" onClick={draft}>
              <Save className="h-4 w-4" />
              Save device draft
            </button>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="card p-5">
            <CloudOff className="h-5 w-5 text-forest-700" />
            <h3 className="mt-3 font-display font-bold">
              Low-bandwidth friendly
            </h3>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Drafts are kept in IndexedDB on this device. Publishing always
              waits for a real server connection.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5 text-xs leading-5 text-amber-800">
            <strong className="block">Before publishing</strong>Review
            voice-captured values, grade claims, available quantity, shelf life
            and price. Kishan Bhaiya never publishes uncertain voice input
            automatically.
          </div>
        </aside>
      </form>
    </>
  );
}
const FormField = ({ label, error, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export function SellerRequestsPage() {
  const { data: reqs = [], isLoading } = useQuery({
    queryKey: ["requirements"],
    queryFn: () => getData(api.get("/bulk-requirements")),
  });
  const [selected, setSelected] = useState(null),
    queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      quantity: 500,
      pricePerUnit: 25.5,
      deliveryDate: "2026-08-29",
      transportCost: 800,
      transportIncluded: false,
      paymentTerms: "Payment within 7 days",
      validUntil: "2026-08-27",
      note: "Fresh lot available after final quality check.",
    },
  });
  const mutation = useMutation({
    mutationFn: (v) =>
      getData(api.post(`/bulk-requirements/${selected._id}/quotations`, v)),
    onSuccess: () => {
      toast.success("Quotation sent");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const open = (r) => {
    setSelected(r);
    reset({
      quantity: Math.min(500, r.quantity),
      pricePerUnit: r.targetPrice || 25,
      deliveryDate: String(r.requiredDate).slice(0, 10),
      transportCost: 800,
      transportIncluded: false,
      paymentTerms: "Payment within 7 days",
      validUntil: "2026-08-27",
      note: "Fresh lot available after final quality check.",
    });
  };
  return (
    <>
      <PageHeader
        eyebrow="Matched demand"
        title="Bulk requests"
        description="Requirements compatible with your products, grade and delivery reach."
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {reqs.map((r) => (
            <div key={r._id} className="relative">
              <RequirementCard requirement={r} sellerView />
              <button
                className="btn-primary absolute bottom-4 left-5"
                onClick={() => open(r)}
              >
                <Send className="h-4 w-4" />
                Send quotation
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Quote · ${selected?.product || ""}`}
      >
        <form
          onSubmit={handleSubmit((v) =>
            mutation.mutate({
              ...v,
              quantity: Number(v.quantity),
              pricePerUnit: Number(v.pricePerUnit),
              transportCost: Number(v.transportCost),
            }),
          )}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Quantity offered">
            <input type="number" className="input" {...register("quantity")} />
          </FormField>
          <FormField label="Price per unit">
            <input
              type="number"
              step="0.1"
              className="input"
              {...register("pricePerUnit")}
            />
          </FormField>
          <FormField label="Delivery date">
            <input
              type="date"
              className="input"
              {...register("deliveryDate")}
            />
          </FormField>
          <FormField label="Transport cost">
            <input
              type="number"
              className="input"
              {...register("transportCost")}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Payment terms">
              <input className="input" {...register("paymentTerms")} />
            </FormField>
          </div>
          <FormField label="Valid until">
            <input type="date" className="input" {...register("validUntil")} />
          </FormField>
          <label className="flex items-center gap-2 pt-8 text-sm font-bold">
            <input
              type="checkbox"
              className="accent-forest-700"
              {...register("transportIncluded")}
            />
            Transport included
          </label>
          <div className="sm:col-span-2">
            <FormField label="Message">
              <textarea className="textarea" {...register("note")} />
            </FormField>
          </div>
          <button
            className="btn-primary sm:col-span-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <InlineLoader label="Sending…" />
            ) : (
              "Send quotation"
            )}
          </button>
        </form>
      </Modal>
    </>
  );
}

export function SellerQuotationsPage() {
  const { data: b, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => getData(api.get("/bootstrap")),
  });
  return (
    <>
      <PageHeader
        eyebrow="Offer management"
        title="Your quotations"
        description="Watch buyer activity and continue structured negotiations before offers expire."
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="table-shell">
          <table className="desktop-table w-full text-left">
            <thead className="bg-cream text-xs uppercase tracking-wider text-gray-500">
              <tr>
                {[
                  "RFQ",
                  "Buyer / product",
                  "Price",
                  "Quantity",
                  "Status",
                  "Last activity",
                  "",
                ].map((x) => (
                  <th key={x} className="px-5 py-4">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {b.quotations.map((q) => {
                const r = b.requirements.find((x) => x._id === q.requirementId);
                return (
                  <tr key={q._id}>
                    <td
                      data-label="RFQ"
                      className="px-5 py-4 text-sm font-bold"
                    >
                      {q.requirementId.toUpperCase()}
                    </td>
                    <td data-label="Buyer / product" className="px-5 py-4">
                      <p className="text-sm font-bold">{r?.buyer}</p>
                      <p className="text-xs text-gray-500">{r?.product}</p>
                    </td>
                    <td
                      data-label="Price"
                      className="px-5 py-4 text-sm font-bold"
                    >
                      {money(q.pricePerUnit)}/kg
                    </td>
                    <td data-label="Quantity" className="px-5 py-4 text-sm">
                      {number(q.quantity)}kg
                    </td>
                    <td data-label="Status" className="px-5 py-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td
                      data-label="Last activity"
                      className="px-5 py-4 text-xs text-gray-500"
                    >
                      {relative(q.createdAt)}
                    </td>
                    <td data-label="Action" className="px-5 py-4">
                      <Link to={`/negotiation/${q._id}`} className="btn-ghost">
                        Open <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function HarvestsPage() {
  const [open, setOpen] = useState(false),
    qc = useQueryClient();
  const { data: harvests = [], isLoading } = useQuery({
    queryKey: ["harvests"],
    queryFn: () => getData(api.get("/expected-harvests")),
  });
  const { register, handleSubmit } = useForm({
    defaultValues: {
      product: "Fresh Desi Tomato",
      productId: "prod-tomato",
      expectedQuantity: 2500,
      expectedHarvestDate: "2026-09-12",
      grade: "A",
      minimumPrice: 25,
      location: "Khordha",
      reservationPercent: 80,
    },
  });
  const mutation = useMutation({
    mutationFn: (v) => getData(api.post("/expected-harvests", v)),
    onSuccess: () => {
      toast.success("Expected harvest published");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["harvests"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const totals = harvests.reduce(
    (a, h) => ({
      quantity: a.quantity + h.expectedQuantity,
      reserved: a.reserved + h.reservedQuantity,
      interest: a.interest + h.interestedBuyers,
    }),
    { quantity: 0, reserved: 0, interest: 0 },
  );
  return (
    <>
      <PageHeader
        eyebrow="Before the harvest"
        title="Expected harvests"
        description="Signal upcoming supply, measure buyer interest and enter harvest day with more demand already visible."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Post expected harvest
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Upcoming harvests"
          value={harvests.length}
          icon={CalendarDays}
        />
        <MetricCard
          label="Demand reserved"
          value={`${number(totals.reserved)}kg`}
          detail={`${Math.round((totals.reserved / Math.max(totals.quantity, 1)) * 100)}% matched`}
          icon={PackageOpen}
          tone="blue"
        />
        <MetricCard
          label="Unmatched quantity"
          value={`${number(totals.quantity - totals.reserved)}kg`}
          icon={Boxes}
          tone="amber"
        />
        <MetricCard
          label="Buyer interest"
          value={totals.interest}
          detail="Across active harvests"
          icon={UsersRound}
          tone="violet"
        />
      </div>
      {isLoading ? (
        <div className="mt-7">
          <LoadingState />
        </div>
      ) : (
        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          {harvests.map((h) => {
            const pct = Math.round(
              (h.reservedQuantity / h.expectedQuantity) * 100,
            );
            return (
              <article key={h._id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <StatusBadge status={h.status} />
                    <h2 className="mt-3 font-display text-xl font-bold">
                      {h.product}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Grade {h.grade} · {h.location} · From{" "}
                      {money(h.minimumPrice)}/kg
                    </p>
                  </div>
                  <div className="rounded-2xl bg-forest-50 p-3 text-right">
                    <p className="text-[10px] font-bold uppercase text-gray-400">
                      Expected
                    </p>
                    <p className="font-display font-bold">
                      {shortDate(h.expectedHarvestDate)}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Progress
                    value={pct}
                    label={`${number(h.reservedQuantity)} / ${number(h.expectedQuantity)}kg demand matched`}
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn-secondary">
                    <Edit3 className="h-4 w-4" />
                    Edit harvest
                  </button>
                  <button className="btn-ghost">
                    <Eye className="h-4 w-4" />
                    {h.interestedBuyers} interested buyers
                  </button>
                  <button className="btn-ghost">Convert to lot</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Post expected harvest"
      >
        <form
          onSubmit={handleSubmit((v) =>
            mutation.mutate({
              ...v,
              expectedQuantity: Number(v.expectedQuantity),
              minimumPrice: Number(v.minimumPrice),
              reservationPercent: Number(v.reservationPercent),
            }),
          )}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField label="Crop">
            <select className="input" {...register("product")}>
              <option>Fresh Desi Tomato</option>
              <option>Dasheri Mango</option>
              <option>Fresh Cauliflower</option>
            </select>
          </FormField>
          <FormField label="Expected quantity">
            <input
              type="number"
              className="input"
              {...register("expectedQuantity")}
            />
          </FormField>
          <FormField label="Harvest date">
            <input
              type="date"
              className="input"
              {...register("expectedHarvestDate")}
            />
          </FormField>
          <FormField label="Expected grade">
            <select className="input" {...register("grade")}>
              <option>A</option>
              <option>Premium</option>
              <option>B</option>
            </select>
          </FormField>
          <FormField label="Minimum price">
            <input
              type="number"
              className="input"
              {...register("minimumPrice")}
            />
          </FormField>
          <FormField label="Location">
            <input className="input" {...register("location")} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Reservation percentage allowed">
              <input
                type="number"
                className="input"
                {...register("reservationPercent")}
              />
            </FormField>
          </div>
          <button
            className="btn-primary sm:col-span-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <InlineLoader /> : "Publish expected harvest"}
          </button>
        </form>
      </Modal>
    </>
  );
}
