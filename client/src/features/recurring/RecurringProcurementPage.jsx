import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CalendarDays,
  Clock3,
  Edit3,
  PackageCheck,
  Pause,
  Play,
  Plus,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api, apiError, getData } from "../../api/client.js";
import {
  EmptyState,
  LoadingState,
  MetricCard,
  Modal,
  PageHeader,
  StatusBadge,
} from "../../components/UI.jsx";
import { money, number, shortDate } from "../../utils/format.js";

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyPlan = () => ({
  product: "",
  category: "Vegetables",
  quantity: "",
  unit: "kg",
  frequency: "WEEKLY",
  weekdays: ["Monday"],
  grade: "A",
  minimumPrice: "",
  maximumPrice: "",
  location: "Bhubaneswar",
  packaging: "Buyer standard",
  transport: "Either",
  allowPartial: true,
  minFillPercent: 80,
  leadTimeDays: 5,
  startDate: "",
  notes: "",
});

const formForPlan = (plan) => ({
  ...emptyPlan(),
  ...plan,
  minimumPrice: plan.priceBand?.[0] ?? "",
  maximumPrice: plan.priceBand?.[1] ?? "",
  startDate: plan.startDate ? String(plan.startDate).slice(0, 10) : "",
});

function PlanForm({ value, onChange }) {
  const field = (name) => ({
    value: value[name],
    onChange: (event) =>
      onChange({ ...value, [name]: event.target.value }),
  });
  const toggleDay = (day) => {
    const selected = value.weekdays.includes(day);
    onChange({
      ...value,
      weekdays: selected
        ? value.weekdays.filter((item) => item !== day)
        : [...value.weekdays, day],
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Product</span>
          <input
            className="input"
            placeholder="Example: Fresh Desi Tomato"
            required
            {...field("product")}
          />
        </label>
        <label>
          <span className="label">Category</span>
          <select className="input" {...field("category")}>
            {[
              "Vegetables",
              "Fruits",
              "Grains",
              "Pulses",
              "Spices",
              "Organic",
              "Other",
            ].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="col-span-2">
          <span className="label">Quantity per requirement</span>
          <input
            className="input"
            type="number"
            min="1"
            required
            {...field("quantity")}
          />
        </label>
        <label>
          <span className="label">Unit</span>
          <select className="input" {...field("unit")}>
            <option>kg</option>
            <option>tonne</option>
            <option>piece</option>
          </select>
        </label>
        <label>
          <span className="label">Grade</span>
          <select className="input" {...field("grade")}>
            <option>A</option>
            <option>B</option>
            <option>Premium</option>
            <option>Standard</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="label">Frequency</span>
          <select className="input" {...field("frequency")}>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Every two weeks</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
        <label>
          <span className="label">Start date</span>
          <input className="input" type="date" {...field("startDate")} />
        </label>
        <label>
          <span className="label">Supplier lead time</span>
          <input
            className="input"
            type="number"
            min="1"
            max="30"
            {...field("leadTimeDays")}
          />
        </label>
      </div>

      <fieldset>
        <legend className="label">Preferred generation days</legend>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => (
            <label
              key={day}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold ${
                value.weekdays.includes(day)
                  ? "border-forest-600 bg-forest-50 text-forest-800"
                  : "border-gray-200 text-gray-500"
              }`}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={value.weekdays.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {day.slice(0, 3)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Minimum target price (optional)</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            {...field("minimumPrice")}
          />
        </label>
        <label>
          <span className="label">Maximum target price (optional)</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            {...field("maximumPrice")}
          />
        </label>
      </div>

      <label className="block">
        <span className="label">Delivery location</span>
        <input className="input" required {...field("location")} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Packaging</span>
          <input className="input" {...field("packaging")} />
        </label>
        <label>
          <span className="label">Transport</span>
          <select className="input" {...field("transport")}>
            <option>Either</option>
            <option>Buyer pickup</option>
            <option>Seller arranged</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Minimum fill percentage</span>
          <input
            className="input"
            type="number"
            min="1"
            max="100"
            {...field("minFillPercent")}
          />
        </label>
        <label className="mt-6 flex items-center gap-3 rounded-xl bg-cream p-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={value.allowPartial}
            onChange={(event) =>
              onChange({ ...value, allowPartial: event.target.checked })
            }
          />
          Allow fulfilment from multiple suppliers
        </label>
      </div>

      <label className="block">
        <span className="label">Supplier notes</span>
        <textarea className="textarea" rows="3" {...field("notes")} />
      </label>
    </div>
  );
}

export default function RecurringProcurementPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyPlan);
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: () => getData(api.get("/recurring-requirements")),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring"] });
    queryClient.invalidateQueries({ queryKey: ["requirements"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const savePlan = useMutation({
    mutationFn: ({ id, payload }) =>
      getData(
        id
          ? api.patch(`/recurring-requirements/${id}`, payload)
          : api.post("/recurring-requirements", payload),
      ),
    onSuccess: () => {
      toast.success(editingId ? "Recurring plan updated" : "Recurring plan created");
      setDialogOpen(false);
      refresh();
    },
    onError: (error) => toast.error(apiError(error)),
  });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }) =>
      getData(api.patch(`/recurring-requirements/${id}`, { status })),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "ACTIVE"
          ? "Recurring plan resumed"
          : variables.status === "PAUSED"
            ? "Recurring plan paused"
            : "Recurring plan archived",
      );
      if (variables.status === "ARCHIVED") setDialogOpen(false);
      refresh();
    },
    onError: (error) => toast.error(apiError(error)),
  });
  const runNow = useMutation({
    mutationFn: (id) =>
      getData(api.post(`/recurring-requirements/${id}/run`)),
    onSuccess: (result) => {
      toast.success("Bulk requirement generated", {
        description: `${result.requirement.product} is now open for quotations.`,
      });
      refresh();
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const visiblePlans = plans.filter((plan) => plan.status !== "ARCHIVED");
  const metrics = useMemo(
    () => ({
      active: plans.filter((plan) => plan.status === "ACTIVE").length,
      paused: plans.filter((plan) => plan.status === "PAUSED").length,
      generated: plans.reduce(
        (total, plan) => total + Number(plan.generatedCount || 0),
        0,
      ),
    }),
    [plans],
  );

  const openNew = () => {
    setEditingId(null);
    setForm(emptyPlan());
    setDialogOpen(true);
  };
  const openEdit = (plan) => {
    setEditingId(plan._id);
    setForm(formForPlan(plan));
    setDialogOpen(true);
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.weekdays.length) {
      toast.error("Select at least one preferred day");
      return;
    }
    if (
      (form.minimumPrice && !form.maximumPrice) ||
      (!form.minimumPrice && form.maximumPrice)
    ) {
      toast.error("Provide both minimum and maximum price, or leave both empty");
      return;
    }
    const payload = {
      product: form.product,
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit,
      frequency: form.frequency,
      weekdays: form.weekdays,
      grade: form.grade,
      priceBand:
        form.minimumPrice && form.maximumPrice
          ? [Number(form.minimumPrice), Number(form.maximumPrice)]
          : null,
      location: form.location,
      packaging: form.packaging,
      transport: form.transport,
      allowPartial: form.allowPartial,
      minFillPercent: Number(form.minFillPercent),
      leadTimeDays: Number(form.leadTimeDays),
      startDate: form.startDate || undefined,
      notes: form.notes,
    };
    savePlan.mutate({ id: editingId, payload });
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Repeat procurement"
        title="Recurring requirements"
        description="Automatically create quotation-ready bulk requirements on a weekly, biweekly or monthly schedule."
        actions={
          <button className="btn-primary" onClick={openNew}>
            <Plus className="h-4 w-4" /> New recurring plan
          </button>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Active plans" value={metrics.active} icon={RefreshCcw} />
        <MetricCard label="Paused plans" value={metrics.paused} icon={Pause} tone="amber" />
        <MetricCard
          label="Requirements generated"
          value={metrics.generated}
          icon={PackageCheck}
          tone="blue"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : visiblePlans.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {visiblePlans.map((plan) => (
            <article key={plan._id} className="card p-6">
              <div className="flex items-center justify-between">
                <StatusBadge status={plan.status} />
                <button
                  className="btn-ghost h-10 w-10 p-0"
                  aria-label={plan.status === "ACTIVE" ? "Pause plan" : "Resume plan"}
                  disabled={changeStatus.isPending}
                  onClick={() =>
                    changeStatus.mutate({
                      id: plan._id,
                      status: plan.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                    })
                  }
                >
                  {plan.status === "ACTIVE" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              </div>
              <h2 className="mt-5 font-display text-xl font-bold">{plan.product}</h2>
              <p className="mt-2 font-display text-3xl font-extrabold text-forest-900">
                {number(plan.quantity)}
                <span className="ml-1 text-sm font-medium text-gray-500">
                  {plan.unit} / requirement
                </span>
              </p>
              <dl className="mt-6 space-y-3 border-y py-5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Frequency</dt>
                  <dd className="font-bold">{plan.frequency}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Preferred days</dt>
                  <dd className="text-right font-bold">{plan.weekdays?.join(", ")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Grade</dt>
                  <dd className="font-bold">{plan.grade}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Price band</dt>
                  <dd className="font-bold">
                    {plan.priceBand
                      ? `${money(plan.priceBand[0])}–${money(plan.priceBand[1])}`
                      : "Open"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-forest-700" />
                <div>
                  <p className="text-xs text-gray-500">Next automatic run</p>
                  <p className="font-bold">
                    {plan.status === "ACTIVE" ? shortDate(plan.nextRun) : "Paused"}
                  </p>
                </div>
              </div>
              {plan.lastRequirementId && (
                <p className="mt-3 text-xs text-gray-500">
                  Last generated: {plan.lastRequirementId}
                </p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  className="btn-primary"
                  disabled={plan.status !== "ACTIVE" || runNow.isPending}
                  onClick={() => runNow.mutate(plan._id)}
                >
                  <Play className="h-4 w-4" /> Run now
                </button>
                <button className="btn-secondary" onClick={() => openEdit(plan)}>
                  <Edit3 className="h-4 w-4" /> Manage
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No recurring procurement plans"
          description="Create a schedule and KisanExpress will open normal bulk requirements for supplier quotations."
          action={
            <button className="btn-primary" onClick={openNew}>
              Create first plan
            </button>
          }
        />
      )}

      <section className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
        <Clock3 className="mr-2 inline h-5 w-5" />
        Automatic runs create standard bulk requirements. Sellers and FPOs then quote
        through the normal procurement workflow; no purchase is made without your
        quotation acceptance.
      </section>

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? "Manage recurring plan" : "New recurring plan"}
        footer={
          <>
            {editingId && (
              <button
                type="button"
                className="btn-ghost mr-auto text-red-600"
                disabled={changeStatus.isPending}
                onClick={() =>
                  changeStatus.mutate({ id: editingId, status: "ARCHIVED" })
                }
              >
                <Archive className="h-4 w-4" /> Archive
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="recurring-plan-form"
              className="btn-primary"
              disabled={savePlan.isPending}
            >
              {savePlan.isPending ? "Saving…" : "Save plan"}
            </button>
          </>
        }
      >
        <form id="recurring-plan-form" onSubmit={submit}>
          <PlanForm value={form} onChange={setForm} />
        </form>
      </Modal>
    </div>
  );
}
