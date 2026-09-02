import { describe, expect, it } from "vitest";
import {
  canShop,
  dashboardNavigationForRole,
  navigationForRole,
  workspaceForRole,
} from "./navigation.js";

describe("role-aware navigation", () => {
  it("shows purchasing and order links to individual buyers", () => {
    expect(navigationForRole("consumer")).toEqual(
      expect.arrayContaining([
        ["nav.stores", "/stores"],
        ["nav.orders", "/orders"],
      ]),
    );
    expect(canShop("consumer")).toBe(true);
  });

  it("shows producer demand and workspace links to farmers", () => {
    const farmerLinks = navigationForRole("farmer");
    expect(farmerLinks).toContainEqual(["nav.demand", "/demand-board"]);
    expect(farmerLinks).toContainEqual(["nav.producer", "/seller/dashboard"]);
    expect(farmerLinks).toContainEqual([
      "nav.fpoMembership",
      "/fpo/membership",
    ]);
    expect(farmerLinks).not.toContainEqual(["nav.marketplace", "/marketplace"]);
    expect(farmerLinks.map(([, path]) => path)).not.toContain("/orders");
    expect(workspaceForRole("farmer")).toBe("/seller/dashboard");
    expect(canShop("farmer")).toBe(false);
  });

  it("shows procurement links to business buyers", () => {
    expect(navigationForRole("business_buyer")).toContainEqual([
      "nav.recurring",
      "/recurring-procurement",
    ]);
    const paths = navigationForRole("business_buyer").map(([, path]) => path);
    expect(paths).not.toContain("/stores");
    expect(paths).not.toContain("/marketplace");
    expect(paths).not.toContain("/cart");
    expect(paths).not.toContain("/demand-board");
    expect(canShop("business_buyer")).toBe(false);
  });

  it("keeps guest, FPO and admin navigation out of the buyer marketplace", () => {
    expect(navigationForRole()).toEqual([]);
    expect(canShop()).toBe(false);
    expect(
      navigationForRole("fpo_manager").map(([, path]) => path),
    ).not.toContain("/marketplace");
    expect(canShop("fpo_manager")).toBe(false);
    expect(navigationForRole("admin")).toEqual([
      ["nav.admin", "/admin"],
      ["nav.storeOperations", "/admin/stores"],
      ["nav.verifications", "/admin/verifications"],
    ]);
    expect(canShop("admin")).toBe(false);
  });

  it("keeps logistics navigation operational and removes shopping controls", () => {
    expect(navigationForRole("logistics")).toEqual([
      ["nav.logistics", "/logistics"],
      ["nav.routePlanner", "/logistics/planner"],
    ]);
    expect(canShop("logistics")).toBe(false);
    expect(workspaceForRole("logistics")).toBe("/logistics/planner");
  });

  it("keeps producer, FPO and logistics workspace features separated", () => {
    const farmerPaths = dashboardNavigationForRole("farmer").map(
      ([, path]) => path,
    );
    const fpoPaths = dashboardNavigationForRole("fpo_manager").map(
      ([, path]) => path,
    );
    const logisticsPaths = dashboardNavigationForRole("logistics").map(
      ([, path]) => path,
    );

    expect(farmerPaths).not.toContain("/fpo/aggregation");
    expect(farmerPaths).not.toContain("/logistics/planner");
    expect(fpoPaths).toContain("/fpo/aggregation");
    expect(fpoPaths).toContain("/fpo/membership");
    expect(logisticsPaths).toEqual(["/logistics", "/logistics/planner"]);
    expect(logisticsPaths).not.toContain("/seller/dashboard");
  });
});
