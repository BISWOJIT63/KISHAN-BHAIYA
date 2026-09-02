import {
  Handshake,
  Heart,
  Home,
  Landmark,
  LayoutDashboard,
  PackageOpen,
  Repeat2,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";

/**
 * Picture-first navigation. Every destination gets a distinct icon AND a
 * distinct colour, so farmers who cannot read the label can still navigate by
 * shape and hue alone. Keep icons visually unambiguous — avoid two items that
 * differ only by a small detail.
 */
export const navIcons = {
  "nav.home": [Home, "text-forest-700", "bg-forest-100"],
  "nav.marketplace": [Store, "text-forest-700", "bg-forest-100"],
  "nav.stores": [ShoppingBasket, "text-emerald-700", "bg-emerald-100"],
  "nav.saved": [Heart, "text-rose-600", "bg-rose-100"],
  "nav.bulk": [ShoppingBasket, "text-amber-700", "bg-amber-100"],
  "nav.recurring": [Repeat2, "text-sky-700", "bg-sky-100"],
  "nav.orders": [PackageOpen, "text-blue-700", "bg-blue-100"],
  "nav.demand": [Handshake, "text-amber-700", "bg-amber-100"],
  "nav.producer": [LayoutDashboard, "text-forest-700", "bg-forest-100"],
  "nav.fpoMembership": [Users, "text-violet-700", "bg-violet-100"],
  "nav.aggregation": [Users, "text-violet-700", "bg-violet-100"],
  "nav.settlements": [Landmark, "text-emerald-700", "bg-emerald-100"],
  "nav.logistics": [Truck, "text-blue-700", "bg-blue-100"],
  "nav.routePlanner": [Route, "text-sky-700", "bg-sky-100"],
  "nav.admin": [ShieldCheck, "text-gray-700", "bg-gray-200"],
  "nav.storeOperations": [Landmark, "text-blue-700", "bg-blue-100"],
  "nav.verifications": [ShieldCheck, "text-gray-700", "bg-gray-200"],
  "nav.farmers": [Sprout, "text-forest-700", "bg-forest-100"],
  "nav.account": [UserRound, "text-gray-700", "bg-gray-200"],
};

const fallback = [Store, "text-forest-700", "bg-forest-100"];

export const navIconFor = (label) => navIcons[label] || fallback;
