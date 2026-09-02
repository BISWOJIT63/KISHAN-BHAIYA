import React from "react";
import {
  Bell,
  ChevronDown,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  ShoppingBasket,
  UserRound,
  X,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useAppStore } from "../store/useAppStore.js";
import { cx, money } from "../utils/format.js";
import {
  canShop,
  navigationForRole,
  workspaceForRole,
} from "../utils/navigation.js";
import { navIconFor } from "../utils/navIcons.js";
import Logo from "./Logo.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import NotificationBell from "./NotificationBell.jsx";
import SmartImage from "./SmartImage.jsx";
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
    startTour,
  } = useAppStore();
  const accountActive = !user || (user.accountStatus || (user.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL")) === "ACTIVE";
  const nav = user && !accountActive ? [["Verification center", "/verification"]] : navigationForRole(user?.role);
  const shoppingEnabled = accountActive && canShop(user?.role);
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const [profileOpen, setProfileOpen] = React.useState(false);
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
        <div className="public-service-strip">
          <div className="container-page flex h-8 items-center justify-between gap-3 text-[11px] font-semibold">
            <span>Public-service style agriculture portal</span>
            <span className="hidden sm:inline">Role-based services · Accessible language choices</span>
          </div>
        </div>
        {/* Tight gaps + a shrinkable logo keep this single row inside a 320px
            viewport. Anything added here must be hidden below `md`. */}
        <div className="container-page flex h-[72px] items-center gap-2 sm:gap-4">
          <Logo />
          <nav className="ml-2 hidden min-w-0 items-center gap-0.5 lg:flex xl:ml-4 xl:gap-1">
            {nav.map(([label, to]) => {
              const [Icon, iconColor] = navIconFor(label);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-[13px] font-semibold xl:px-3 xl:text-sm",
                      isActive
                        ? "bg-forest-50 text-forest-800"
                        : "text-gray-600 hover:text-forest-800",
                    )
                  }
                >
                  {/* Icons only where there is room for them; the mobile menu and
                      bottom tab bar carry the icon language on small screens. */}
                  <Icon className={cx("hidden h-4 w-4 shrink-0 xl:block", iconColor)} />
                  {t(label)}
                </NavLink>
              );
            })}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            {shoppingEnabled && <button type="button" className="btn-ghost hidden max-w-52 px-2 xl:flex" onClick={() => navigate("/profile")} title="Change delivery location in profile settings">
              <MapPin className="h-4 w-4 text-forest-600" />
              <span className="max-w-36 truncate text-sm">{location}</span>
            </button>}
            {shoppingEnabled && <button
              className="btn-ghost relative hidden h-11 w-11 px-0 md:flex"
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
            <LanguageSwitcher variant="header" className="hidden md:flex" />
            {user && <NotificationBell />}
            {shoppingEnabled && <button
              data-tour="cart"
              className="btn-ghost relative h-11 w-11 px-0"
              onClick={() => setCartOpen(true)}
              aria-label={t("cart.open")}
            >
              <ShoppingBasket className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-cream bg-harvest px-1 text-[10px] font-extrabold text-amber-950">
                  {count}
                </span>
              )}
            </button>}
            {user ? (
              // Below lg the mobile menu already carries profile + sign out, so
              // this dropdown would be a duplicate entry point.
              <div className="relative hidden lg:block">
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
              <div className="hidden gap-2 md:flex">
                <Link to="/login" className="btn-ghost">
                  {t("nav.login")}
                </Link>
                <Link to="/register" className="btn-primary">
                  {t("nav.create")}
                </Link>
              </div>
            )}
            <button
              data-tour="menu"
              className="btn-ghost h-11 w-11 px-0 lg:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label={t("nav.menu")}
              aria-expanded={mobileMenu}
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
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-gray-200 bg-white px-4 py-4 lg:hidden">
            <nav className="container-page grid gap-1 px-0">
              {/* Language first: it is the one control that unlocks every other
                  label on the page for a non-English reader. */}
              <div className="mb-2 md:hidden">
                <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[.14em] text-gray-500">
                  {t("language.label")}
                </p>
                <LanguageSwitcher variant="segmented" />
              </div>
              {nav.map(([label, to]) => {
                const [Icon, iconColor, iconBg] = navIconFor(label);
                return (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-gray-700 hover:bg-forest-50"
                    onClick={() => setMobileMenu(false)}
                  >
                    <span
                      aria-hidden="true"
                      className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconBg)}
                    >
                      <Icon className={cx("h-5 w-5", iconColor)} />
                    </span>
                    {t(label)}
                  </Link>
                );
              })}
              {user && (
                <Link
                  to="/notifications"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-gray-700 hover:bg-forest-50"
                  onClick={() => setMobileMenu(false)}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-harvest/20"
                  >
                    <Bell className="h-5 w-5 text-amber-700" />
                  </span>
                  {t("notifications.title")}
                </Link>
              )}
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold text-gray-700 hover:bg-forest-50"
                onClick={() => {
                  setMobileMenu(false);
                  startTour();
                }}
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100"
                >
                  <LifeBuoy className="h-5 w-5 text-sky-700" />
                </span>
                {t("tour.replay")}
              </button>
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
                    <SmartImage
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
