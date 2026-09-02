import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, getData } from "../api/client.js";
import { useAppStore } from "../store/useAppStore.js";

/**
 * Maps a notification onto the screen that resolves it. Returning null means
 * "no dedicated destination" so callers can keep the user where they are.
 */
export const notificationTarget = (notification) => {
  if (!notification) return null;
  if (notification.actionPath) return notification.actionPath;
  const { type = "", entityId = "" } = notification;
  if (type.startsWith("FPO_MEMBERSHIP")) return "/fpo/membership";
  if (type === "ORDER_DELIVERED" && entityId) return `/orders/${entityId}/review`;
  if (entityId.startsWith("ship")) return `/shipments/${entityId}`;
  if (entityId.startsWith("quote")) return `/negotiation/${entityId}`;
  if (entityId.startsWith("order")) return `/orders/${entityId}`;
  return null;
};

/**
 * Single source of truth for the notification list. Shared by the navbar bell
 * and the full notifications page so unread counts never disagree.
 */
export function useNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const accountActive =
    !user ||
    (user.accountStatus || (user.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL")) ===
      "ACTIVE";

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getData(api.get("/notifications")),
    staleTime: 20000,
    enabled: Boolean(user) && accountActive,
  });

  const notifications = query.data || [];
  const unread = notifications.filter((item) => !item.read);

  const markRead = useMutation({
    mutationFn: async (ids) =>
      Promise.all(ids.map((id) => api.patch(`/notifications/${id}/read`))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const open = (notification, onNavigate) => {
    if (!notification.read) markRead.mutate([notification._id]);
    const target = notificationTarget(notification);
    if (target) {
      onNavigate?.();
      navigate(target);
    }
  };

  return {
    ...query,
    notifications,
    unread,
    unreadCount: unread.length,
    hasUnread: unread.length > 0,
    markRead,
    markAllRead: () => markRead.mutate(unread.map((item) => item._id)),
    open,
    enabled: Boolean(user) && accountActive,
  };
}
