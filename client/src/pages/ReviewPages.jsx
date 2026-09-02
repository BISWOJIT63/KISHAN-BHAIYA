import React from "react";
import { ChevronLeft, MessageSquareHeart, PartyPopper, Send, ShieldCheck, Sprout, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI.jsx";
import SmartImage from "../components/SmartImage.jsx";
import { StarRating, RatingSummary } from "../components/StarRating.jsx";
import { cx, shortDate } from "../utils/format.js";

/**
 * Tags do the work a comment box cannot: they let someone who does not want to
 * type still say *what* was good or bad, and they translate cleanly.
 */
const PLATFORM_TAGS = ["easyToUse", "priceClear", "fastCheckout", "hardToFind", "confusing", "slow"];
const SELLER_TAGS = ["freshProduce", "goodPacking", "onTime", "fairWeight", "lateDelivery", "notAsDescribed"];

function TagPicker({ options, prefix, value, onChange }) {
  const { t } = useTranslation();
  const toggle = (tag) =>
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => {
        const active = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(tag)}
            className={cx(
              "min-h-11 rounded-2xl border px-4 text-sm font-bold transition",
              active
                ? "border-forest-700 bg-forest-700 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-forest-300 hover:bg-forest-50",
            )}
          >
            {t(`${prefix}.${tag}`)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Shown straight after checkout — the moment the buyer has just experienced the
 * whole flow. It rates the marketplace itself, not the farmer; the farmer review
 * only unlocks after the produce actually arrives.
 */
export function PlatformFeedbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [tags, setTags] = React.useState([]);

  const submit = useMutation({
    mutationFn: () =>
      getData(api.post("/platform-feedback", { rating, comment, tags, orderId: orderId || "" })),
    onSuccess: () => {
      toast.success(t("feedback.thanks"));
      navigate(orderId ? `/orders/${orderId}` : "/orders");
    },
    onError: (error) => toast.error(apiError(error)),
  });

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="card overflow-hidden">
        <div className="bg-forest-900 px-6 py-8 text-center text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <PartyPopper className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold">{t("feedback.orderPlaced")}</h1>
          <p className="mt-2 text-sm text-forest-100">
            {orderId ? t("feedback.orderRef", { orderId }) : t("feedback.orderPlacedSub")}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold">{t("feedback.question")}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{t("feedback.help")}</p>
          <div className="mt-5">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {rating > 0 && (
            <>
              <p className="mt-6 text-sm font-bold text-gray-700">{t("feedback.tagsLabel")}</p>
              <div className="mt-3">
                <TagPicker options={PLATFORM_TAGS} prefix="feedback.tag" value={tags} onChange={setTags} />
              </div>
              <label className="mt-6 block">
                <span className="text-sm font-bold text-gray-700">{t("review.commentOptional")}</span>
                <textarea
                  className="input mt-2 min-h-28"
                  value={comment}
                  maxLength={1000}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("feedback.commentPlaceholder")}
                />
              </label>
            </>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!rating || submit.isPending}
              onClick={() => submit.mutate()}
            >
              <Send className="h-4 w-4" />
              {t("feedback.submit")}
            </button>
            <Link className="btn-ghost justify-center" to={orderId ? `/orders/${orderId}` : "/orders"}>
              {t("feedback.skip")}
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-forest-600" />
            {t("feedback.privacy")}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The post-delivery review. Rates the farmer or FPO who supplied the order, with
 * an optional per-item rating so a good seller is not punished for one weak line.
 */
export function OrderReviewPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [tags, setTags] = React.useState([]);
  const [itemRatings, setItemRatings] = React.useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["review-eligibility", id],
    queryFn: () => getData(api.get(`/orders/${id}/review-eligibility`)),
  });

  const submit = useMutation({
    mutationFn: () =>
      getData(
        api.post(`/orders/${id}/reviews`, {
          rating,
          comment,
          tags,
          productRatings: Object.entries(itemRatings)
            .filter(([, score]) => score > 0)
            .map(([productId, score]) => ({ productId, rating: score })),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-eligibility", id] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      toast.success(t("review.thanks"));
      navigate(`/orders/${id}`);
    },
    onError: (error_) => toast.error(apiError(error_)),
  });

  if (isLoading) return <div className="container-page py-12"><LoadingState cards={2} /></div>;
  if (error) return <div className="container-page py-12"><ErrorState message={apiError(error)} /></div>;

  const backLink = (
    <Link to={`/orders/${id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700">
      <ChevronLeft className="h-4 w-4" />
      {t("review.backToOrder")}
    </Link>
  );

  if (!data.delivered)
    return (
      <div className="container-page max-w-2xl py-10">
        {backLink}
        <EmptyState
          title={t("review.notDeliveredTitle")}
          description={t("review.notDeliveredBody")}
          action={<Link className="btn-primary" to={`/orders/${id}`}>{t("review.trackOrder")}</Link>}
        />
      </div>
    );

  if (data.alreadyReviewed)
    return (
      <div className="container-page max-w-2xl py-10">
        {backLink}
        <EmptyState
          title={t("review.alreadyTitle")}
          description={t("review.alreadyBody")}
          action={<Link className="btn-primary" to="/orders">{t("review.backToOrders")}</Link>}
        />
      </div>
    );

  return (
    <div className="container-page max-w-2xl py-10">
      {backLink}
      <PageHeader
        eyebrow={t("review.eyebrow")}
        title={t("review.title")}
        description={t("review.description")}
      />

      <section className="card p-6">
        {/* Who is being rated, with a face and a place — not just an id. */}
        <div className="space-y-4">
          {data.sellers.map((seller) => (
            <div key={seller.sellerId} className="flex items-center gap-4">
              <SmartImage
                src={seller.image}
                variant="avatar"
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold">{seller.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <Sprout className="h-4 w-4 text-forest-600" />
                  {seller.type} · {seller.location}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <h2 className="font-display text-xl font-bold">{t("review.sellerQuestion")}</h2>
          <div className="mt-4">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
        </div>

        {rating > 0 && (
          <>
            <p className="mt-6 text-sm font-bold text-gray-700">{t("review.tagsLabel")}</p>
            <div className="mt-3">
              <TagPicker options={SELLER_TAGS} prefix="review.tag" value={tags} onChange={setTags} />
            </div>
            <label className="mt-6 block">
              <span className="text-sm font-bold text-gray-700">{t("review.commentOptional")}</span>
              <textarea
                className="input mt-2 min-h-28"
                value={comment}
                maxLength={1000}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t("review.commentPlaceholder")}
              />
            </label>
          </>
        )}
      </section>

      {data.items.length > 0 && (
        <section className="card mt-5 p-6">
          <h2 className="font-display text-lg font-bold">{t("review.itemsTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("review.itemsHint")}</p>
          <div className="mt-5 space-y-5">
            {data.items.map((item) => (
              <div key={item.productId} className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-5 first:border-0 first:pt-0">
                <SmartImage src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                <div className="min-w-32 flex-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity}{item.unit || "kg"}</p>
                </div>
                <StarRating
                  size="sm"
                  value={itemRatings[item.productId] || 0}
                  onChange={(score) =>
                    setItemRatings((current) => ({ ...current, [item.productId]: score }))
                  }
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!rating || submit.isPending}
          onClick={() => submit.mutate()}
        >
          <MessageSquareHeart className="h-4 w-4" />
          {t("review.submit")}
        </button>
        <Link className="btn-ghost justify-center" to={`/orders/${id}`}>
          {t("review.later")}
        </Link>
      </div>
      <p className="mt-4 text-xs leading-5 text-gray-500">
        <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-forest-600" />
        {t("review.visibility")}
      </p>
    </div>
  );
}

/** Read-only review list, reused by the product and seller pages. */
export function ReviewList({ reviews = [], summary, emptyTitle, emptyBody }) {
  const { t } = useTranslation();
  if (!reviews.length)
    return (
      <EmptyState
        title={emptyTitle || t("review.emptyTitle")}
        description={emptyBody || t("review.emptyBody")}
      />
    );
  return (
    <div>
      {summary && (
        <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-cream p-5">
          <div className="text-center">
            <p className="font-display text-4xl font-extrabold text-forest-900">
              {Number(summary.displayed?.rating ?? summary.average ?? 0).toFixed(1)}
            </p>
            <StarRating value={summary.displayed?.rating ?? summary.average ?? 0} size="sm" />
          </div>
          <div className="min-w-40 flex-1">
            {(summary.distribution || []).map((row) => {
              const percent = summary.count ? Math.round((row.count / summary.count) * 100) : 0;
              return (
                <div key={row.star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 font-bold text-gray-600">{row.star}<Star className="ml-0.5 inline h-3 w-3 fill-harvest text-harvest" /></span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <span className="block h-full rounded-full bg-harvest" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-gray-500">{row.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ul className="mt-5 space-y-4">
        {reviews.map((review) => (
          <li key={review._id} className="rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">{review.authorName || t("review.anonymous")}</p>
                <p className="mt-0.5 text-xs text-gray-500">{shortDate(review.createdAt)}</p>
              </div>
              <StarRating value={review.rating} size="sm" />
            </div>
            {review.comment && <p className="mt-3 text-sm leading-6 text-gray-700">{review.comment}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {review.verifiedPurchase && (
                <span className="badge bg-forest-50 text-forest-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("review.verifiedPurchase")}
                </span>
              )}
              {(review.tags || []).map((tag) => (
                <span key={tag} className="badge bg-gray-100 text-gray-600">
                  {t(`review.tag.${tag}`, { defaultValue: tag })}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Product reviews tab content. */
export function ProductReviews({ productId }) {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () => getData(api.get(`/products/${productId}/reviews`)),
  });
  if (isLoading) return <LoadingState cards={2} />;
  if (error) return <ErrorState message={t("review.loadError")} />;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{t("review.productTitle")}</h3>
        <RatingSummary
          rating={data.summary.displayed?.rating}
          reviews={data.summary.displayed?.reviews}
        />
      </div>
      <ReviewList
        reviews={data.reviews}
        summary={data.summary}
        emptyTitle={t("review.emptyProductTitle")}
        emptyBody={t("review.emptyProductBody")}
      />
    </div>
  );
}

export default OrderReviewPage;
