import {
  Heart,
  Home,
  Landmark,
  LayoutDashboard,
  PackageOpen,
  Repeat2,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import { cx } from "../utils/format.js";
import { navigationForRole } from "../utils/navigation.js";

const icons = {
  "nav.marketplace": Store,
  "nav.saved": Heart,
  "nav.bulk": ShoppingBasket,
  "nav.recurring": Repeat2,
  "nav.orders": PackageOpen,
  "nav.demand": ShoppingBasket,
  "nav.producer": LayoutDashboard,
  "nav.aggregation": Users,
  "nav.settlements": Landmark,
  "nav.logistics": Truck,
  "nav.routePlanner": Route,
  "nav.admin": ShieldCheck,
  "nav.farmers": Store,
};

export default function MobileBottomNav() {
  const user = useAppStore((state) => state.user);
  const { t } = useTranslation();
  const roleItems = navigationForRole(user?.role);
  const showHome = roleItems.length < 4 && !["logistics", "logistics_partner", "driver"].includes(user?.role);
  const items = [
    ...(showHome ? [["nav.home", "/", Home]] : []),
    ...roleItems.map(([label, to]) => [label, to, icons[label] || Store]),
    ["nav.account", user ? "/profile" : "/login", UserRound],
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 grid border-t border-gray-200 bg-white/95 px-1 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(21,61,46,.08)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(([label, to, Icon]) => (
        <NavLink
          key={`${label}-${to}`}
          to={to}
          className={({ isActive }) =>
            cx(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold",
              isActive ? "text-forest-800" : "text-gray-400",
            )
          }
        >
          <Icon className="h-5 w-5" />
          <span className="max-w-full truncate">{t(label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
