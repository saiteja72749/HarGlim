import { describe, expect, it } from "vitest";
import {
  canOpenAuthorDashboard,
  getAuthorApplicationState,
  getHomeRouteForContext,
  isPaidAuthorDashboardEnabled,
} from "./author-access";

const ctx = (overrides: {
  role?: string;
  canAccess?: boolean;
  appStatus?: string;
  dashboardAccessStatus?: string;
  paid?: boolean;
}) =>
  ({
    user: { role: overrides.role ?? "author" },
    capabilities: {
      canPublish: overrides.role === "author",
      canAccessAuthorDashboard: overrides.canAccess ?? overrides.role === "author",
      canAdminister: overrides.role === "admin",
    },
    states: {
      authorApplicationStatus: overrides.appStatus ?? "APPROVED",
      dashboardAccessStatus: overrides.dashboardAccessStatus ?? "NOT_PURCHASED",
      publishingStatus: "APPROVED",
    },
    features: overrides.paid === undefined ? undefined : { paidAuthorDashboardAccess: overrides.paid },
  }) as any;

describe("author dashboard access (paid access disabled)", () => {
  it("1. reader cannot open the author dashboard", () => {
    const c = ctx({ role: "reader", appStatus: "NONE", paid: false });
    expect(canOpenAuthorDashboard({ role: "reader" }, c)).toBe(false);
  });

  it("2. pending applicant cannot open the author dashboard", () => {
    const c = ctx({ role: "reader", appStatus: "PENDING", paid: false });
    expect(canOpenAuthorDashboard({ role: "reader" }, c)).toBe(false);
    expect(getAuthorApplicationState(c)).toBe("pending");
  });

  it("3/4. approved author with no purchase or entitlement can open it", () => {
    const c = ctx({ role: "author", dashboardAccessStatus: "NOT_PURCHASED", paid: false });
    expect(canOpenAuthorDashboard({ role: "author" }, c)).toBe(true);
  });

  it("5. historical REVOKED / PAYMENT_PENDING states do not block access", () => {
    for (const status of ["REVOKED", "PAYMENT_PENDING", "VERIFICATION_PENDING", "ACTIVE"]) {
      const c = ctx({ role: "author", dashboardAccessStatus: status, paid: false });
      expect(canOpenAuthorDashboard({ role: "author" }, c)).toBe(true);
    }
  });

  it("6/7. purchase UI is off unless the flag is explicitly true", () => {
    expect(isPaidAuthorDashboardEnabled(ctx({ paid: false }))).toBe(false);
    expect(isPaidAuthorDashboardEnabled(ctx({}))).toBe(false); // flag missing
    expect(isPaidAuthorDashboardEnabled(null)).toBe(false);
    expect(isPaidAuthorDashboardEnabled(ctx({ paid: true }))).toBe(true);
  });

  it("uses the fresh context role over a stale cached role", () => {
    // Cached store user still says reader; backend context says approved author.
    expect(canOpenAuthorDashboard({ role: "reader" }, ctx({ role: "author", paid: false }))).toBe(true);
  });

  it("respects an explicit capability denial", () => {
    expect(canOpenAuthorDashboard({ role: "author" }, ctx({ role: "author", canAccess: false }))).toBe(false);
  });

  it("falls back to the role before the context has loaded", () => {
    expect(canOpenAuthorDashboard({ role: "author" }, null)).toBe(true);
    expect(canOpenAuthorDashboard({ role: "reader" }, null)).toBe(false);
  });
});

describe("application state and landing route", () => {
  it("maps application states", () => {
    expect(getAuthorApplicationState(ctx({ appStatus: "REJECTED" }))).toBe("rejected");
    expect(getAuthorApplicationState(ctx({ appStatus: "APPROVED" }))).toBe("approved");
    expect(getAuthorApplicationState(null)).toBe("none");
  });

  it("routes each role to its home after login", () => {
    expect(getHomeRouteForContext({ role: "author" }, ctx({ role: "author", paid: false }))).toBe("/author");
    expect(getHomeRouteForContext({ role: "admin" }, ctx({ role: "admin" }))).toBe("/admin");
    expect(getHomeRouteForContext({ role: "reader" }, ctx({ role: "reader" }))).toBe("/");
  });
});
