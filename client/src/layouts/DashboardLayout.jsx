import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  PackageOpen,
  ReceiptIndianRupee,
  Route,
  ShieldCheck,
  Tags,
  Truck,
  Users,
  UserPlus,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import MobileBottomNav from "../components/MobileBottomNav.jsx";
import { cx } from "../utils/format.js";
import { useAppStore } from "../store/useAppStore.js";
import { dashboardNavigationForRole, workspaceLabelForRole } from "../utils/navigation.js";

const icons = {
  admin: ShieldCheck,
  aggregation: Users,
  analytics: BarChart3,
  harvests: Landmark,
  home: Home,
  membership: UserPlus,
  orders: PackageOpen,
  payments: ReceiptIndianRupee,
  products: Boxes,
  quotations: FileText,
  requests: ClipboardList,
  route: Route,
  settlements: ReceiptIndianRupee,
  shipments: Truck,
  surplus: Tags,
};
export default function DashboardLayout() {
  const lowBandwidth = useAppStore((state) => state.lowBandwidth);
  const user = useAppStore((state) => state.user);
  const items = dashboardNavigationForRole(user?.role);
  return (
    <div className={`min-h-screen bg-cream pb-16 md:pb-0 ${lowBandwidth ? "low-bandwidth" : ""}`}>
      <Navbar />
      <div className="container-page grid gap-6 py-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="card sticky top-24 hidden h-[calc(100vh-7.5rem)] p-3 lg:block">
          <div className="mb-2 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {workspaceLabelForRole(user?.role)}
            </p>
          </div>
          <nav className="space-y-1">
            {items.map(([label, to, icon]) => {
              const Icon = icons[icon] || Home;
              return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                    isActive
                      ? "bg-forest-900 text-white"
                      : "text-gray-600 hover:bg-forest-50 hover:text-forest-900",
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </NavLink>
            )})}
          </nav>
        </aside>
        <main className="min-w-0 py-2">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
