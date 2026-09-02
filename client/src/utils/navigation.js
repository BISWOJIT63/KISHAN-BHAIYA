const roleNavigation = {
  guest: [],
  consumer: [
    ["nav.stores", "/stores"],
    ["nav.saved", "/saved"],
    ["nav.orders", "/orders"],
  ],
  business_buyer: [
    ["nav.bulk", "/bulk"],
    ["nav.recurring", "/recurring-procurement"],
    ["nav.orders", "/orders"],
  ],
  farmer: [
    ["nav.demand", "/demand-board"],
    ["nav.producer", "/seller/dashboard"],
    ["nav.fpoMembership", "/fpo/membership"],
  ],
  fpo_manager: [
    ["nav.producer", "/seller/dashboard"],
    ["nav.aggregation", "/fpo/aggregation"],
    ["nav.settlements", "/fpo/settlements"],
    ["nav.fpoMembership", "/fpo/membership"],
  ],
  logistics: [
    ["nav.logistics", "/logistics"],
    ["nav.routePlanner", "/logistics/planner"],
  ],
  driver: [["nav.logistics", "/logistics"]],
  logistics_partner: [
    ["nav.logistics", "/logistics"],
    ["nav.routePlanner", "/logistics/planner"],
  ],
  admin: [
    ["nav.admin", "/admin"],
    ["nav.storeOperations", "/admin/stores"],
    ["nav.verifications", "/admin/verifications"],
  ],
};

const producerWorkspace = [
  ["Overview", "/seller/dashboard", "home"],
  ["Products", "/seller/products", "products"],
  ["Seller orders", "/seller/orders", "orders"],
  ["Bulk requests", "/seller/bulk-requests", "requests"],
  ["Quotations", "/seller/quotations", "quotations"],
  ["Expected harvests", "/harvests", "harvests"],
  ["FPO membership", "/fpo/membership", "membership"],
  ["Surplus rescue", "/surplus", "surplus"],
  ["Payments", "/seller/payments", "payments"],
  ["Analytics", "/seller/analytics", "analytics"],
];

const workspaceNavigation = {
  farmer: producerWorkspace,
  fpo_manager: [
    ...producerWorkspace,
    ["FPO aggregation", "/fpo/aggregation", "aggregation"],
    ["Member settlements", "/fpo/settlements", "settlements"],
  ],
  logistics: [
    ["Shipments", "/logistics", "shipments"],
    ["Route planner", "/logistics/planner", "route"],
  ],
  driver: [["My trips", "/logistics", "shipments"]],
  logistics_partner: [
    ["Shipments", "/logistics", "shipments"],
    ["Route planner", "/logistics/planner", "route"],
  ],
  admin: [
    ["Admin operations", "/admin", "admin"],
    ["Urban stores", "/admin/stores", "stores"],
    ["Verification queue", "/admin/verifications", "admin"],
  ],
};

// Retail shopping and bulk procurement are intentionally separate journeys.
// Business buyers source through requirements and quotations, not the cart.
const shoppingRoles = new Set(["consumer"]);

export const navigationForRole = (role) =>
  roleNavigation[role || "guest"] || roleNavigation.guest;

export const dashboardNavigationForRole = (role) =>
  workspaceNavigation[role] || [];

export const workspaceLabelForRole = (role) =>
  ({
    fpo_manager: "FPO workspace",
    logistics: "Logistics workspace",
    driver: "Driver workspace",
    logistics_partner: "Fleet workspace",
    admin: "Administration workspace",
  })[role] || "Producer workspace";

export const canShop = (role) => shoppingRoles.has(role);

export const workspaceForRole = (role) => {
  if (["farmer", "fpo_manager"].includes(role)) return "/seller/dashboard";
  if (role === "driver") return "/logistics";
  if (["logistics", "logistics_partner"].includes(role))
    return "/logistics/planner";
  if (role === "admin") return "/admin";
  if (role === "business_buyer") return "/bulk";
  return "/orders";
};
