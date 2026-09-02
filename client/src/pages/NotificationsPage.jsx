import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "../components/UI.jsx";
import { NotificationRow } from "../components/NotificationBell.jsx";
import { useNotifications } from "../hooks/useNotifications.js";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    hasUnread,
    markAllRead,
    open,
    isLoading,
    error,
  } = useNotifications();

  return (
    <div className="container-page py-8 sm:py-10">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-forest-700"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <PageHeader
        eyebrow={t("notifications.eyebrow")}
        title={t("notifications.title")}
        description={
          hasUnread
            ? t("notifications.unreadSummary", { count: unreadCount })
            : t("notifications.allRead")
        }
        actions={
          hasUnread && (
            <button type="button" className="btn-secondary" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              {t("notifications.markAll")}
            </button>
          )
        }
      />

      {isLoading ? (
        <LoadingState cards={3} />
      ) : error ? (
        <ErrorState message={t("notifications.loadError")} />
      ) : notifications.length ? (
        <div className="card overflow-hidden">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              onSelect={open}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("notifications.empty")}
          description={t("notifications.emptyHint")}
          action={
            <Link className="btn-primary" to="/">
              <Bell className="h-4 w-4" />
              {t("nav.home")}
            </Link>
          }
        />
      )}
    </div>
  );
}
