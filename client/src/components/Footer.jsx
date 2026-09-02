import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.js";
import { workspaceForRole } from "../utils/navigation.js";
import Logo from "./Logo.jsx";

const roleLinks = {
  consumer: [
    ["Buyer", [["Marketplace", "/marketplace"], ["Saved products", "/saved"], ["My orders", "/orders"]]],
  ],
  business_buyer: [
    ["Procurement", [["Marketplace", "/marketplace"], ["Bulk requirements", "/bulk"], ["Recurring procurement", "/recurring-procurement"], ["My orders", "/orders"]]],
  ],
  farmer: [
    ["Farmer", [["Producer workspace", "/seller/dashboard"], ["Demand board", "/demand-board"], ["FPO membership", "/fpo/membership"], ["Expected harvests", "/harvests"]]],
  ],
  fpo_manager: [
    ["FPO", [["Producer workspace", "/seller/dashboard"], ["Membership requests", "/fpo/membership"], ["Aggregation", "/fpo/aggregation"], ["Member settlements", "/fpo/settlements"]]],
  ],
  logistics: [
    ["Logistics", [["Shipments", "/logistics"], ["Route planner", "/logistics/planner"]]],
  ],
  logistics_partner: [
    ["Fleet", [["Shipments", "/logistics"], ["Route planner", "/logistics/planner"]]],
  ],
  admin: [
    ["Administration", [["Admin operations", "/admin"], ["Verification queue", "/admin/verifications"]]],
  ],
};

export default function Footer() {
  const user = useAppStore((state) => state.user);
  const accountActive = !user || (user.accountStatus || (user.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL")) === "ACTIVE";
  const groups = !user
    ? [["Get started", [["Log in", "/login"], ["Create account", "/register"]]]]
    : !accountActive
      ? [["Account", [["Verification center", "/verification"], ["My profile", "/profile"]]]]
      : roleLinks[user.role] || [];
  const publicLinks = [["Home", "/"], ["How it works", "/#how-it-works"], ...(user ? [["My profile", "/profile"], ["My workspace", workspaceForRole(user.role)]] : [])];

  return (
    <footer className="mt-20 bg-forest-950 text-white">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_3fr]">
          <div>
            <Logo light />
            <p className="mt-5 max-w-xs text-sm leading-6 text-forest-100/70">A trusted bridge between India’s producers and the people and businesses they feed.</p>
            <div className="mt-6 space-y-2 text-xs text-forest-100/60">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />India-wide location support</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" />hello@kisanexpress.demo</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" />Development demo support</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            {[...groups, ["KisanExpress", publicLinks]].map(([group, links]) => (
              <div key={group}>
                <h3 className="text-sm font-bold">{group}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map(([label, to]) => <li key={`${label}-${to}`}><Link to={to} className="text-sm text-forest-100/60 hover:text-white">{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-xs text-forest-100/50 sm:flex-row sm:items-center">
          <p>© 2026 KisanExpress. Development demonstration — all accounts and provider data are fictional.</p>
          <div className="flex items-center gap-3"><a href="#" aria-label="Facebook"><Facebook className="h-4 w-4" /></a><a href="#" aria-label="Instagram"><Instagram className="h-4 w-4" /></a><a href="#" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a></div>
        </div>
      </div>
    </footer>
  );
}
