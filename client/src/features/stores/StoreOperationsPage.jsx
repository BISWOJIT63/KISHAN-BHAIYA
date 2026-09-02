import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import { api, apiError, getData } from "../../api/client.js";
import { money, number } from "../../utils/format.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "../../components/UI.jsx";
import { PageMotion } from "../../components/Motion.jsx";

export function StoreOperationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["store-operations"],
    queryFn: () => getData(api.get("/store-operations")),
    refetchInterval: 20_000,
  });
  const updateInventory = useMutation({
    mutationFn: ({ inventoryId, changes }) =>
      getData(api.patch(`/store-operations/inventory/${inventoryId}`, changes)),
    onSuccess: () => {
      toast.success("Store inventory updated");
      queryClient.invalidateQueries({ queryKey: ["store-operations"] });
    },
    onError: (reason) => toast.error(apiError(reason)),
  });
  const updateOrder = useMutation({
    mutationFn: ({ orderId, status }) =>
      getData(
        api.patch(`/store-operations/orders/${orderId}/status`, { status }),
      ),
    onSuccess: () => {
      toast.success("Store order updated");
      queryClient.invalidateQueries({ queryKey: ["store-operations"] });
    },
    onError: (reason) => toast.error(apiError(reason)),
  });
  if (isLoading)
    return (
      <div className="container-page py-10">
        <LoadingState />
      </div>
    );
  if (error)
    return (
      <div className="container-page py-10">
        <ErrorState message={apiError(error)} onRetry={refetch} />
      </div>
    );
  const lowStock = data.inventory.filter(
    (item) => item.status !== "IN_STOCK" || Number(item.stock) <= 5,
  );
  return (
    <PageMotion className="container-page py-10">
      <PageHeader
        eyebrow="Urban store network"
        title="Government and franchise store operations"
        description="Monitor public and licensed outlets, replenish city stock, prepare express orders and hand assigned trips to drivers."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open stores"
          value={data.stores.filter((item) => item.status === "OPEN").length}
          icon={Store}
        />
        <MetricCard
          label="Government outlets"
          value={
            data.stores.filter((item) => item.ownershipType === "GOVERNMENT")
              .length
          }
          icon={Building2}
          tone="blue"
        />
        <MetricCard
          label="Franchise outlets"
          value={
            data.stores.filter((item) => item.ownershipType === "FRANCHISE")
              .length
          }
          icon={Warehouse}
          tone="amber"
        />
        <MetricCard
          label="Low-stock lines"
          value={lowStock.length}
          icon={PackageCheck}
          tone="violet"
        />
      </div>
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Express fulfilment</p>
            <h2 className="section-title mt-2">Store orders</h2>
          </div>
          <span className="badge bg-blue-50 text-blue-700">
            <Truck className="h-3.5 w-3.5" />
            Driver-linked
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {data.orders.length ? (
            data.orders.map((order) => (
              <article
                key={order._id}
                className="card flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold">{order._id}</h3>
                    <StatusBadge status={order.status} />
                    <span className="badge bg-gray-100 text-gray-700">
                      {order.storeOwnershipType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {order.storeName} · {order.items.length} items ·{" "}
                    {money(order.total)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Shipment {order.shipmentId || "awaiting assignment"} ·
                    target {order.estimatedMinutes} minutes
                  </p>
                </div>
                {order.status === "PACKING" && (
                  <button
                    className="btn-primary"
                    disabled={updateOrder.isPending}
                    onClick={() =>
                      updateOrder.mutate({
                        orderId: order._id,
                        status: "READY_FOR_PICKUP",
                      })
                    }
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Ready for driver
                  </button>
                )}
              </article>
            ))
          ) : (
            <EmptyState title="No store orders yet" />
          )}
        </div>
      </section>
      <section className="mt-10">
        <p className="eyebrow">City inventory</p>
        <h2 className="section-title mt-2">Small-pack stock control</h2>
        <div className="mt-5 table-shell">
          <table className="desktop-table w-full text-left text-sm">
            <thead className="bg-cream text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Store</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.inventory.map((item) => (
                <tr key={item._id}>
                  <td data-label="Store" className="px-5 py-4 font-semibold">
                    {item.storeName}
                  </td>
                  <td data-label="Product" className="px-5 py-4">
                    {item.productName}
                  </td>
                  <td data-label="Stock" className="px-5 py-4 font-bold">
                    {number(item.stock)}
                    {item.unit}
                  </td>
                  <td data-label="Price" className="px-5 py-4">
                    {money(item.price, 1)}/{item.unit}
                  </td>
                  <td data-label="Status" className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td data-label="Restock" className="px-5 py-4">
                    <div className="flex justify-end gap-2 md:justify-start">
                      <button
                        className="btn-secondary min-h-9 px-3"
                        disabled={updateInventory.isPending || item.stock <= 0}
                        onClick={() =>
                          updateInventory.mutate({
                            inventoryId: item._id,
                            changes: {
                              stock: Math.max(0, Number(item.stock) - 5),
                            },
                          })
                        }
                      >
                        −5
                      </button>
                      <button
                        className="btn-primary min-h-9 px-3"
                        disabled={updateInventory.isPending}
                        onClick={() =>
                          updateInventory.mutate({
                            inventoryId: item._id,
                            changes: { stock: Number(item.stock) + 10 },
                          })
                        }
                      >
                        +10
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
        <ShieldCheck className="mr-2 inline h-5 w-5" />
        <strong>Ownership remains transparent.</strong> Government-operated and
        licensed franchise stores use the same stock, pricing, audit and
        driver-assignment rules, while their operating type stays visible to
        buyers.
      </section>
    </PageMotion>
  );
}
