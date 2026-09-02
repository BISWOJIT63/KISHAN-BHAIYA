import { ArrowRight, Leaf, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import { EmptyState, PageHeader } from "../components/UI.jsx";
import { money } from "../utils/format.js";
import SmartImage from '../components/SmartImage.jsx';

export default function CartPage() {
  const { t } = useTranslation();
  const { cart, updateCart, removeFromCart } = useAppStore();
  const subtotal = cart.reduce(
    (total, item) =>
      total +
      (item.quantity >= item.bulkThreshold ? item.bulkPrice : item.price) *
        item.quantity,
    0,
  );
  const delivery = subtotal >= 799 ? 0 : 49;
  const total = subtotal + delivery;

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow={t("cart.eyebrow")}
        title={t("cart.title")}
        description={t("cart.description")}
      />
      {!cart.length ? (
        <EmptyState
          title={t("cart.empty")}
          description={t("cart.emptyHelp")}
          action={
            <Link to="/marketplace" className="btn-primary">
              {t("cart.browse")}
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-7 lg:grid-cols-[1fr_380px]">
          <section className="card overflow-hidden">
            {cart.map((item) => {
              const bulk = item.quantity >= item.bulkThreshold;
              const price = bulk ? item.bulkPrice : item.price;
              return (
                <article
                  key={item.productId}
                  className="flex flex-col gap-4 border-b border-gray-100 p-5 last:border-0 sm:flex-row"
                >
                  <SmartImage
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-full rounded-2xl object-cover sm:w-32"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to={`/product/${item.productId}`}
                          className="font-display text-lg font-bold hover:text-forest-700"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">
                          {t("cart.soldBy", { seller: item.seller })}
                        </p>
                        {bulk && (
                          <span className="badge mt-2 bg-forest-50 text-forest-700">
                            {t("cart.bulk")}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="btn-ghost h-9 w-9 p-0 text-red-500"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-4">
                      <div className="flex h-10 items-center rounded-xl border">
                        <button
                          className="grid h-full w-9 place-items-center"
                          onClick={() => updateCart(item.productId, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-9 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          className="grid h-full w-9 place-items-center"
                          onClick={() => updateCart(item.productId, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold">
                          {money(price * item.quantity)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {money(price)}/{item.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
          <aside className="card sticky top-24 p-6">
            <h2 className="font-display text-xl font-bold">{t("cart.summary")}</h2>
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t("common.subtotal")}</span><span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t("common.delivery")}</span>
                <span>{delivery ? money(delivery) : <strong className="text-forest-700">{t("common.free")}</strong>}</span>
              </div>
              <div className="flex justify-between border-t pt-4 font-display text-xl font-bold">
                <span>{t("common.total")}</span><span>{money(total)}</span>
              </div>
            </div>
            {subtotal < 799 && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <Truck className="mr-2 inline h-4 w-4" />
                Add {money(799 - subtotal)} for free delivery.
              </div>
            )}
            <Link to="/checkout" className="btn-primary mt-6 w-full">
              {t("cart.checkout")} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Leaf className="h-4 w-4 text-forest-600" /> FEFO allocation helps reduce produce waste.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
