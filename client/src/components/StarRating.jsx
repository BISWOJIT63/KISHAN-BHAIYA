import React from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "../utils/format.js";

const SIZES = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

/**
 * Stars are the one rating control that needs no reading ability, so they are the
 * primary input everywhere feedback is collected. Each star is a real <button>
 * inside a radiogroup: big enough to hit with a thumb, reachable by keyboard, and
 * announced by a screen reader without depending on the label text.
 */
export function StarRating({
  value = 0,
  onChange,
  size = "md",
  labels,
  className = "",
}) {
  const { t } = useTranslation();
  const [hover, setHover] = React.useState(0);
  const active = hover || value;
  const wordFor = (score) =>
    labels?.[score - 1] || t(`review.score.${score}`, { defaultValue: "" });

  if (!onChange) {
    return (
      <span className={cx("inline-flex items-center gap-0.5", className)} aria-label={t("review.ratingOf", { rating: value })}>
        {[1, 2, 3, 4, 5].map((score) => (
          <Star
            key={score}
            aria-hidden="true"
            className={cx(
              SIZES[size],
              score <= Math.round(value)
                ? "fill-harvest text-harvest"
                : "text-gray-300",
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div role="radiogroup" aria-label={t("review.ratingLabel")} className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} — ${wordFor(score)}`}
            onClick={() => onChange(score)}
            onMouseEnter={() => setHover(score)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(score)}
            onBlur={() => setHover(0)}
            className="grid h-12 w-12 place-items-center rounded-2xl transition hover:bg-harvest/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-harvest/40"
          >
            <Star
              className={cx(
                SIZES[size],
                score <= active ? "fill-harvest text-harvest" : "text-gray-300",
              )}
            />
          </button>
        ))}
      </div>
      {/* The chosen number is repeated in words: a farmer who cannot read the
          scale can still hear or recognise "Good" next to four filled stars. */}
      <p className="min-h-6 text-sm font-bold text-forest-800" aria-live="polite">
        {active ? wordFor(active) : ""}
      </p>
    </div>
  );
}

/** Compact inline display used on cards and list rows. */
export function RatingSummary({ rating = 0, reviews = 0, className = "" }) {
  const { t } = useTranslation();
  return (
    <span className={cx("inline-flex items-center gap-2 text-sm", className)}>
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">
        <Star className="h-3.5 w-3.5 fill-current" />
        {Number(rating || 0).toFixed(1)}
      </span>
      <span className="text-gray-500">{t("review.count", { count: reviews })}</span>
    </span>
  );
}

export default StarRating;
