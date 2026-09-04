import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import { useAppStore } from "../store/useAppStore.js";
import { InlineLoader, PageHeader } from "../components/UI.jsx";
import { money } from "../utils/format.js";
import SmartImage from '../components/SmartImage.jsx';
export default function CheckoutPage() {
  const { t } = useTranslation();
  const { cart, clearCart, user } = useAppStore(),
    navigate = useNavigate(),
    [payment, setPayment] = useState("UPI"),
    [address, setAddress] = useState(
      "Plot 214, Jayadev Vihar, Bhubaneswar, Odisha 751013",
    ),
    [slot, setSlot] = useState("Tomorrow · 8:00–11:00 AM"),
    [idempotencyKey] = useState(() => crypto.randomUUID());
  const subtotal = cart.reduce(
      (n, i) =>
        n +
        (!i.storeId && i.quantity >= i.bulkThreshold ? i.bulkPrice : i.price) * i.quantity,
      0,
    ),
    delivery = subtotal >= 799 ? 0 : 49;
  const storeId = cart[0]?.storeId;
  const isStoreOrder = Boolean(storeId && cart.every((item) => item.storeId === storeId && item.storeInventoryId));
  const order = useMutation({
    mutationFn: () => {
      if (isStoreOrder) {
        return getData(api.post(`/urban-stores/${storeId}/orders`, {
          items: cart.map((item) => ({ inventoryId: item.storeInventoryId, quantity: item.quantity })),
          paymentMethod: payment === "COD" ? "COD" : "UPI",
          deliveryAddress: address,
          deliveryCoordinates: user?.locationCoordinates,
        }));
      }
      return getData(api.post(
          "/orders",
          {
            items: cart.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
            paymentMethod: payment,
            deliveryAddress: address,
            deliverySlot: slot,
          },
          { headers: { "Idempotency-Key": idempotencyKey } },
        ));
    },
    onSuccess: (data) => {
      const confirmedOrder = data.order || data;
      clearCart();
      toast.success(t("checkout.confirmed"), {
        description: `${confirmedOrder._id} is being prepared${data.urbanStore?.name ? ` by ${data.urbanStore.name}` : ""}.`,
      });
      // Straight to the feedback screen while the experience is fresh; it links
      // on to the order, so nobody is stranded there.
      navigate(`/feedback/${confirmedOrder._id}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });
  if (!cart.length)
    return (
      <div className="container-page py-14 text-center">
        <PackageCheck className="mx-auto h-12 w-12 text-forest-600" />
        <h1 className="mt-4 page-title">{t("cart.empty")}</h1>
        <Link className="btn-primary mt-6" to="/marketplace">
          {t("cart.browse")}
        </Link>
      </div>
    );
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow={t("checkout.eyebrow")}
        title={t("checkout.title")}
        description={t("checkout.description")}
      />
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <MapPin className="h-5 w-5 text-forest-700" />
              {t("checkout.address")}
            </h2>
            <label className="label mt-5" htmlFor="address">
              {t("checkout.fullAddress")}
            </label>
            <textarea
              id="address"
              className="textarea"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="mt-2 text-xs text-gray-500">
              Contact: {user?.phone || "Use profile contact"} · Receiver:{" "}
              {user?.name}
            </p>
          </section>
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <Truck className="h-5 w-5 text-forest-700" />
              {t("checkout.slot")}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Tomorrow · 8:00–11:00 AM", "Tomorrow · 3:00–6:00 PM"].map(
                (x) => (
                  <button
                    key={x}
                    onClick={() => setSlot(x)}
                    className={`rounded-2xl border p-4 text-left text-sm font-bold ${slot === x ? "border-forest-600 bg-forest-50 text-forest-800" : "border-gray-200"}`}
                  >
                    {x}
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      {t("checkout.window")}
                    </span>
                  </button>
                ),
              )}
            </div>
          </section>
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <CreditCard className="h-5 w-5 text-forest-700" />
              {t("checkout.payment")}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(isStoreOrder ? [
                ["UPI", "UPI · Mock"],
                ["COD", "Cash on delivery"],
              ] : [
                ["UPI", "UPI · Mock"],
                ["CARD", "Card · Mock"],
                ["COD", "Cash on delivery"],
                ["WALLET", "Wallet · Mock"],
              ]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${payment === value ? "border-forest-600 bg-forest-50" : "border-gray-200"}`}
                >
                  <input
                    type="radio"
                    value={value}
                    checked={payment === value}
                    onChange={() => setPayment(value)}
                    className="accent-forest-700"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-amber-700">
              <LockKeyhole className="h-4 w-4" />
              {t("checkout.mock")}
            </p>
          </section>
        </div>
        <aside className="card sticky top-24 p-6">
          <h2 className="font-display text-xl font-bold">{t("checkout.summary")}</h2>
          <div className="mt-5 max-h-72 space-y-4 overflow-auto">
            {cart.map((i) => (
              <div key={i.productId} className="flex gap-3">
                <SmartImage
                  src={i.image}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{i.name}</p>
                  <p className="text-xs text-gray-500">
                    {i.quantity}
                    {i.unit}
                  </p>
                </div>
                <span className="text-sm font-bold">
                  {money(
                    (!i.storeId && i.quantity >= i.bulkThreshold ? i.bulkPrice : i.price) *
                      i.quantity,
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 border-t pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("common.subtotal")}</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("common.delivery")}</span>
              <span>{delivery ? money(delivery) : t("common.free")}</span>
            </div>
            <div className="flex justify-between border-t pt-4 font-display text-xl font-bold">
              <span>{t("common.total")}</span>
              <span>{money(subtotal + delivery)}</span>
            </div>
          </div>
          <button
            className="btn-primary mt-6 w-full"
            disabled={order.isPending || !address.trim()}
            onClick={() => order.mutate()}
          >
            {order.isPending ? (
              <InlineLoader label={t("checkout.confirming")} />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("checkout.place")}
              </>
            )}
          </button>
          <p className="mt-4 text-center text-[11px] leading-5 text-gray-500">
            By placing this order you accept the demo marketplace terms.
            Server-side stock checks may reject unavailable quantities.
          </p>
        </aside>
      </div>
    </div>
  );
}
