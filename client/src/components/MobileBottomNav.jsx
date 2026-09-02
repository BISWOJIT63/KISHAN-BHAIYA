import { Home, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import { cx } from "../utils/format.js";
import { navigationForRole } from "../utils/navigation.js";
import { navIconFor } from "../utils/navIcons.js";

export default function MobileBottomNav() {
  const user = useAppStore((state) => state.user);
  const { t } = useTranslation();
  const roleItems = navigationForRole(user?.role);
  const showHome =
    roleItems.length < 4 &&
    !["logistics", "logistics_partner"].includes(user?.role);
  const items = [
    ...(showHome ? [["nav.home", "/", Home]] : []),
    ...roleItems.map(([label, to]) => [label, to, navIconFor(label)[0]]),
    ["nav.account", user ? "/profile" : "/login", UserRound],
  ];

  return (
    <nav
      data-tour="nav-primary"
      aria-label={t("nav.primary")}
      className="fixed bottom-0 left-0 right-0 z-50 grid border-t border-gray-200 bg-white/95 px-1 pb-[max(.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(21,61,46,.08)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(([label, to, Icon]) => (
        <NavLink
          key={`${label}-${to}`}
          to={to}
          className={({ isActive }) =>
            cx(
              // min-h-14 keeps every tab at a comfortable thumb target.
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-center text-[11px] font-bold",
              isActive ? "bg-forest-50 text-forest-800" : "text-gray-500",
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active tab gets a filled pill so the current location is
                  obvious without reading the label. */}
              <span
                aria-hidden="true"
                className={cx(
                  "grid h-7 w-9 place-items-center rounded-lg transition",
                  isActive && "bg-forest-100",
                )}
              >
                <Icon className={cx("h-5 w-5", isActive && "text-forest-800")} />
              </span>
              <span className="max-w-full truncate leading-tight">{t(label)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
