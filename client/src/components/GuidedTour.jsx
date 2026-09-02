import React from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore.js";
import { cx } from "../utils/format.js";

/**
 * Steps are matched to elements by `data-tour="<id>"`. A step whose anchor is
 * absent *or hidden at this breakpoint* (desktop-only control, signed out) is
 * skipped rather than spotlighting an empty 0x0 box.
 *
 * `fallback` rescues a step whose ideal anchor is breakpoint-hidden. The header
 * language switcher is desktop-only, so on phones the language step retargets
 * the menu button — where the switcher actually lives on small screens — and
 * `replaces` retires the later menu step so the same button is not spotlighted
 * twice. Losing the language step on mobile would be the worst possible
 * omission: it is the one control that makes every other label readable.
 */
const steps = [
  {
    id: "language",
    key: "tour.language",
    fallback: { id: "menu", key: "tour.languageMenu", replaces: "menu" },
  },
  { id: "notifications", key: "tour.notifications" },
  { id: "cart", key: "tour.cart" },
  { id: "nav-primary", key: "tour.nav" },
  { id: "menu", key: "tour.menu" },
];

const PADDING = 8;

/** `display:none` elements are still returned by querySelector but measure 0x0. */
const anchorFor = (id) => {
  const node = document.querySelector(`[data-tour="${id}"]`);
  if (!node) return null;
  const box = node.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? node : null;
};

export default function GuidedTour() {
  const { t } = useTranslation();
  const { tourRunning, tourSeen, startTour, endTour } = useAppStore();
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState(null);

  // Only the steps whose anchors are actually on screen right now, each already
  // resolved to the element it will spotlight and the copy it will show.
  const visible = React.useMemo(() => {
    if (!tourRunning) return [];
    const resolved = [];
    const retired = new Set();
    for (const step of steps) {
      // A step retired by an earlier step's fallback has already been covered.
      if (retired.has(step.id)) continue;
      if (anchorFor(step.id)) {
        resolved.push({ anchorId: step.id, key: step.key });
      } else if (step.fallback && anchorFor(step.fallback.id)) {
        resolved.push({ anchorId: step.fallback.id, key: step.fallback.key });
        if (step.fallback.replaces) retired.add(step.fallback.replaces);
      }
    }
    return resolved;
  }, [tourRunning]);

  // First run: offer the tour once the shell has painted.
  React.useEffect(() => {
    if (tourSeen || tourRunning) return undefined;
    const timer = window.setTimeout(() => startTour(), 1200);
    return () => window.clearTimeout(timer);
  }, [tourSeen, tourRunning, startTour]);

  const step = visible[index];

  // Track the highlighted element's box through scroll and resize.
  React.useEffect(() => {
    if (!step) return undefined;
    const node = anchorFor(step.anchorId);
    if (!node) return undefined;

    const measure = () => {
      const box = node.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };

    node.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  const finish = React.useCallback(() => {
    setIndex(0);
    endTour();
  }, [endTour]);

  React.useEffect(() => {
    if (!tourRunning) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tourRunning, finish]);

  if (!tourRunning) return null;
  if (!visible.length) return null;
  if (!step || !rect) return null;

  const last = index === visible.length - 1;
  // Place the bubble below the target unless that would run off-screen.
  const below = rect.top + rect.height + 190 < window.innerHeight;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      {/* Click-catcher only — it must stay transparent. The dimming comes from the
          spotlight's 9999px box-shadow below, which leaves the target rect bright.
          Tinting this layer too would dim the highlighted element as well. */}
      <div className="absolute inset-0" onMouseDown={finish} />
      <div
        className="pointer-events-none absolute rounded-2xl ring-4 ring-harvest transition-all duration-300"
        style={{
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(23,34,29,.7)",
        }}
      />

      <section
        className={cx(
          "absolute left-1/2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl bg-white p-5 shadow-2xl",
          "sm:left-auto sm:translate-x-0",
        )}
        style={
          below
            ? {
                top: Math.min(
                  rect.top + rect.height + 16,
                  window.innerHeight - 210,
                ),
              }
            : { bottom: Math.max(window.innerHeight - rect.top + 16, 16) }
        }
      >
        <div className="flex items-start justify-between gap-3">
          <span className="badge bg-forest-100 text-forest-800">
            {index + 1} / {visible.length}
          </span>
          <button
            type="button"
            className="btn-ghost -mr-2 -mt-2 h-9 w-9 px-0"
            onClick={finish}
            aria-label={t("tour.skip")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 className="mt-3 font-display text-xl font-bold">
          {t(`${step.key}.title`)}
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-gray-600">
          {t(`${step.key}.body`)}
        </p>
        <div className="mt-5 flex items-center gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={finish}>
            {t("tour.skip")}
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => (last ? finish() : setIndex((value) => value + 1))}
          >
            {last ? (
              <>
                <Check className="h-4 w-4" />
                {t("tour.done")}
              </>
            ) : (
              <>
                {t("tour.next")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
