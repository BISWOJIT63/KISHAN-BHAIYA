import React from "react";
import {
  Bell,
  ChevronDown,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBasket,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api, getData } from "../api/client.js";
import { useAppStore } from "../store/useAppStore.js";
import { cx, relative, money } from "../utils/format.js";
import {
  canShop,
  navigationForRole,
  workspaceForRole,
} from "../utils/navigation.js";
import Logo from "./Logo.jsx";
import { EmptyState } from "./UI.jsx";
import UserAvatar from "./UserAvatar.jsx";
export default function Navbar() {
  const navigate = useNavigate(),
    { t } = useTranslation(),
    queryClient = useQueryClient();
  const {
    user,
    cart,
    savedProducts,
    location,
    cartOpen,
    mobileMenu,
    setCartOpen,
    setMobileMenu,
    clearSession,
  } = useAppStore();
  const accountActive = !user || (user.accountStatus || (user.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL")) === "ACTIVE";
  const nav = user && !accountActive ? [["Verification center", "/verification"]] : navigationForRole(user?.role);
  const shoppingEnabled = accountActive && canShop(user?.role);
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getData(api.get("/notifications")),
    staleTime: 20000,
    enabled: Boolean(user) && accountActive,
  });
  const markNotifications = useMutation({
    mutationFn: async (ids) =>
      Promise.all(ids.map((id) => api.patch(`/notifications/${id}/read`))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const openNotification = (notification) => {
    if (!notification.read) markNotifications.mutate([notification._id]);
    setNotificationsOpen(false);
    if (notification.type?.startsWith("FPO_MEMBERSHIP"))
      navigate("/fpo/membership");
    else if (notification.entityId?.startsWith("ship"))
      navigate(`/shipments/${notification.entityId}`);
    else if (notification.entityId?.startsWith("quote"))
      navigate(`/negotiation/${notification.entityId}`);
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /** session still clears locally */
    }
    queryClient.clear();
    clearSession();
    setProfileOpen(false);
    navigate("/");
  };
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-forest-900/10 bg-cream/95 backdrop-blur-xl">
        <div className="container-page flex h-[72px] items-center gap-5">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {nav.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    "rounded-xl px-3 py-2 text-sm font-semibold",
                    isActive
                      ? "bg-forest-50 text-forest-800"
                      : "text-gray-600 hover:text-forest-800",
                  )
                }
              >
                {t(label)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            {shoppingEnabled && <button type="button" className="btn-ghost hidden max-w-52 px-2 md:flex" onClick={() => navigate("/profile")} title="Change delivery location in profile settings">
              <MapPin className="h-4 w-4 text-forest-600" />
              <span className="max-w-36 truncate text-sm">{location}</span>
            </button>}
            {shoppingEnabled && <button
              className="btn-ghost hidden px-2 sm:flex"
              aria-label="Search"
              onClick={() => navigate("/marketplace")}
            >
              <Search className="h-5 w-5" />
            </button>}
            {shoppingEnabled && <button
              className="btn-ghost relative hidden h-10 px-2 sm:flex"
              onClick={() => navigate("/saved")}
              aria-label={t("nav.saved")}
            >
              <Heart className="h-5 w-5" />
              {savedProducts.length > 0 && (
                <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-forest-700 px-1 text-[10px] font-extrabold text-white">
                  {savedProducts.length}
                </span>
              )}
            </button>}
            {user && <div className="relative hidden sm:block">
              <button
                className="btn-ghost h-10 px-2"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-cream bg-harvest" />
                )}
              </button>
              {notificationsOpen && (
                <div className="card absolute right-0 top-12 z-50 w-[360px] max-w-[90vw] overflow-hidden shadow-lift">
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <h3 className="font-display font-bold">{t("notifications.title")}</h3>
                    {notifications.some((n) => !n.read) && (
                      <button
                        className="text-xs font-bold text-forest-700"
                        onClick={() =>
                          markNotifications.mutate(
                            notifications.filter((n) => !n.read).map((n) => n._id),
                          )
                        }
                      >
                        {t("notifications.markAll")}
                      </button>
                    )}
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    {notifications.length ? (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n._id}
                          className="block w-full border-b border-gray-100 px-5 py-4 text-left hover:bg-forest-50/60"
                          onClick={() => openNotification(n)}
                        >
                          <div className="flex gap-3">
                            <span
                              className={cx(
                                "mt-1 h-2 w-2 shrink-0 rounded-full",
                                n.read ? "bg-gray-200" : "bg-harvest",
                              )}
                            />
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {n.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-500">
                                {n.message}
                              </p>
                              <p className="mt-2 text-[11px] font-medium text-gray-400">
                                {relative(n.createdAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <EmptyState title={t("notifications.empty")} />
                    )}
                  </div>
                </div>
              )}
            </div>}
            {shoppingEnabled && <button
              className="btn-ghost relative h-10 px-2"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingBasket className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-harvest px-1 text-[10px] font-extrabold text-amber-950">
                  {count}
                </span>
              )}
            </button>}
            {user ? (
              <div className="relative hidden sm:block">
                <button
                  className="flex h-10 items-center gap-2 rounded-xl px-2 hover:bg-forest-50"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <UserAvatar user={user} className="h-8 w-8 rounded-full text-xs" />
                  <span className="hidden text-left xl:block">
                    <span className="block text-xs font-bold leading-4">
                      {user.name}
                    </span>
                    <span className="block text-[10px] capitalize text-gray-500">
                      {t(`role.${user.role}`, user.role?.replace("_", " "))}
                    </span>
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {profileOpen && (
                  <div className="card absolute right-0 top-12 w-56 p-2 shadow-lift">
                    <Link
                      className="btn-ghost w-full justify-start"
                      to={workspaceForRole(user.role)}
                      onClick={() => setProfileOpen(false)}
                    >
                      {t("nav.workspace")}
                    </Link>
                    {shoppingEnabled && <Link
                      className="btn-ghost w-full justify-start"
                      to="/saved"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Heart className="h-4 w-4" /> {t("nav.saved")}
                    </Link>}
                    <Link
                      className="btn-ghost w-full justify-start"
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                    >
                      {t("nav.profile")}
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        className="btn-ghost w-full justify-start"
                        to="/admin"
                        onClick={() => setProfileOpen(false)}
                      >
                        {t("nav.admin")}
                      </Link>
                    )}
                    <button
                      className="btn-ghost w-full justify-start text-red-600"
                      onClick={logout}
                    >
                      {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden gap-2 sm:flex">
                <Link to="/login" className="btn-ghost">
                  {t("nav.login")}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t("nav.create")}
                </Link>
              </div>
            )}
            <button
              className="btn-ghost h-10 px-2 lg:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Open menu"
            >
              {mobileMenu ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="border-t border-gray-200 bg-white px-4 py-4 lg:hidden">
            <nav className="container-page grid gap-1 px-0">
              {nav.map(([label, to]) => (
                <Link
                  key={to}
                  to={to}
                  className="rounded-xl px-3 py-3 font-semibold text-gray-700 hover:bg-forest-50"
                  onClick={() => setMobileMenu(false)}
                >
                  {t(label)}
                </Link>
              ))}
              {!user && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link to="/login" className="btn-secondary">
                    {t("nav.login")}
                  </Link>
                  <Link to="/register" className="btn-primary">
                    {t("nav.create")}
                  </Link>
                </div>
              )}
              {user && (
                <div className="mt-3 grid gap-2 border-t border-gray-100 pt-3">
                  <Link
                    to="/profile"
                    className="btn-secondary w-full"
                    onClick={() => setMobileMenu(false)}
                  >
                    <UserRound className="h-4 w-4" /> {t("nav.profile")}
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost w-full justify-center text-red-600"
                    onClick={() => {
                      setMobileMenu(false);
                      logout();
                    }}
                  >
                    <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>
      {shoppingEnabled && cartOpen && (
        <div
          className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCartOpen(false);
          }}
        >
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="font-display text-xl font-bold">
                  {t("cart.title")}
                </h2>
                <p className="text-xs text-gray-500">
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                className="btn-ghost h-10 w-10 p-0"
                onClick={() => setCartOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 overflow-auto p-5">
              {cart.length ? (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="mb-4 flex gap-3 border-b border-gray-100 pb-4"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.seller}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-forest-800">
                          {money(
                            (item.quantity >= item.bulkThreshold
                              ? item.bulkPrice
                              : item.price) * item.quantity,
                          )}
                        </span>
                        <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
                          <button
                            onClick={() =>
                              useAppStore
                                .getState()
                                .updateCart(item.productId, item.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              useAppStore
                                .getState()
                                .updateCart(item.productId, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t("cart.empty")}
                  description="Seasonal produce from verified farmers is waiting in the marketplace."
                  action={
                    <Link
                      to="/marketplace"
                      onClick={() => setCartOpen(false)}
                      className="btn-primary"
                    >
                      {t("cart.browse")}
                    </Link>
                  }
                />
              )}
            </div>
            {cart.length > 0 && (
              <footer className="border-t border-gray-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {t("common.subtotal")}
                  </span>
                  <strong className="font-display text-xl">
                    {money(
                      cart.reduce(
                        (n, i) =>
                          n +
                          (i.quantity >= i.bulkThreshold
                            ? i.bulkPrice
                            : i.price) *
                            i.quantity,
                        0,
                      ),
                    )}
                  </strong>
                </div>
                <Link
                  to="/cart"
                  onClick={() => setCartOpen(false)}
                  className="btn-primary w-full"
                >
                  {t("cart.review")}
                </Link>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
