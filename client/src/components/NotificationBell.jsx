import React from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  Handshake,
  PackageCheck,
  Star,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cx, relative } from "../utils/format.js";
import { useNotifications } from "../hooks/useNotifications.js";

/** Picture-first cues so a notification is recognisable without reading it. */
const typeIcons = {
  FPO_MEMBERSHIP_REQUEST: [Users, "bg-violet-100 text-violet-700"],
  FPO_MEMBERSHIP_UPDATED: [Users, "bg-violet-100 text-violet-700"],
  BULK_ALLOCATION: [PackageCheck, "bg-amber-100 text-amber-700"],
  SHIPMENT_ASSIGNED: [Truck, "bg-blue-100 text-blue-700"],
  IN_TRANSIT_LOAD_OFFER: [Truck, "bg-blue-100 text-blue-700"],
  ORDER_DELIVERED: [Star, "bg-emerald-100 text-emerald-700"],
  QUOTATION: [Handshake, "bg-sky-100 text-sky-700"],
};

export function NotificationIcon({ type, className }) {
  const [Icon, tone] = typeIcons[type] || [BellRing, "bg-forest-100 text-forest-700"];
  return (
    <span
      aria-hidden="true"
      className={cx("grid shrink-0 place-items-center rounded-xl", tone, className)}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** One row, shared between the bell panel and the full page. */
export function NotificationRow({ notification, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cx(
        "flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-forest-50/60 sm:px-5",
        !notification.read && "bg-forest-50/40",
      )}
    >
      <NotificationIcon type={notification.type} className="h-11 w-11" />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-5 text-gray-900">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-harvest" />
          )}
        </span>
        <span className="mt-1 block text-sm leading-5 text-gray-600">
          {notification.message}
        </span>
        <span className="mt-2 block text-xs font-medium text-gray-400">
          {relative(notification.createdAt)}
        </span>
      </span>
    </button>
  );
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { notifications, unreadCount, hasUnread, markAllRead, open: openNotification } =
    useNotifications();

  // Close on Escape and lock background scroll while the mobile sheet is up.
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    if (window.matchMedia("(max-width: 639px)").matches)
      document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        data-tour="notifications"
        className="btn-ghost relative h-11 w-11 px-0"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          hasUnread
            ? t("notifications.unreadAria", { count: unreadCount })
            : t("notifications.title")
        }
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-cream bg-harvest px-1 text-[10px] font-extrabold text-amber-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Dims the page on phones; on desktop it is an invisible click-catcher. */}
          <div
            className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
            onMouseDown={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("notifications.title")}
            className={cx(
              // Phone: modal bottom sheet. It deliberately sits over the tab bar
              // (z-[70] vs z-50) the way a native sheet does — the backdrop,
              // Escape key and close button are the ways out.
              "fixed inset-x-0 bottom-0 z-[70] flex max-h-[82vh] flex-col overflow-hidden rounded-t-3xl border border-forest-900/10 bg-white shadow-2xl",
              // Desktop: anchored dropdown under the bell.
              "sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-12 sm:max-h-[520px] sm:w-[380px] sm:rounded-[20px] sm:shadow-lift",
            )}
          >
            {/* Grab handle reads as "draggable sheet" on touch devices. */}
            <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-gray-300 sm:hidden" />
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5">
              <h2 className="font-display text-lg font-bold sm:text-base">
                {t("notifications.title")}
              </h2>
              <div className="flex items-center gap-1">
                {hasUnread && (
                  <button
                    type="button"
                    className="btn-ghost h-9 px-2 text-xs font-bold text-forest-700"
                    onClick={markAllRead}
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="hidden xs:inline">{t("notifications.markAll")}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 px-0 sm:hidden"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {notifications.length ? (
                notifications
                  .slice(0, 8)
                  .map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onSelect={(item) => openNotification(item, () => setOpen(false))}
                    />
                  ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-700">
                    <Bell className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-display text-base font-bold">
                    {t("notifications.empty")}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("notifications.emptyHint")}
                  </p>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-3">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="btn-secondary w-full"
              >
                {t("notifications.viewAll")}
              </Link>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
