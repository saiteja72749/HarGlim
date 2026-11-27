import { expect, test, type Page } from "@playwright/test";

async function routeFixture(page: Page, role: "admin" | "author", payloads: Record<string, unknown>) {
  const user = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Fixture account", email: "handover@example.invalid", role, isActive: true };
  await page.addInitScript((value) => localStorage.setItem("auth-storage", JSON.stringify({
    version: 0, state: { user: value, token: "handover-fixture", isAuthenticated: true },
  })), user);
  await page.route((url) => url.pathname.startsWith("/api/") || url.pathname === "/health/ready", async (route) => {
    const request = route.request();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, OPTIONS",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (request.method() !== "GET") return route.abort();
    const path = new URL(request.url()).pathname;
    const data = path === "/api/users/me/context"
      ? { user, capabilities: { canAdminister: role === "admin", canPublish: role === "author", canAccessAuthorDashboard: role === "author" } }
      : payloads[path];
    return route.fulfill({ headers, json: { success: true, data: data ?? [] } });
  });
}

test.beforeEach(({ baseURL }) => {
  test.skip(!baseURL || !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(baseURL), "Browser fixtures require a local frontend.");
});

const config = { currentVersion: "fixture-v2", effectiveAt: "2026-11-26T00:00:00.000Z", enforcementEnabled: true };

test("mocked author sees only the configured publishing terms when acceptance is required", async ({ page }) => {
  await routeFixture(page, "author", {
    "/api/publishing-terms": config,
    "/api/authors/me/publishing-terms": { ...config, accepted: false, requiresAcceptance: true },
    "/api/content": { termsSectionsJson: '[{"title":"Publishing agreement","content":"Configured fixture terms."}]' },
  });
  await page.goto("/author/manuscripts/new");
  const consent = page.getByRole("checkbox", { name: "I accept the current publishing terms" });
  await expect(page.getByText("Configured fixture terms.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Manuscript", exact: true })).toBeDisabled();
  await consent.check();
  await expect(consent).toBeChecked();
});

test("mocked disabled enforcement never forces acceptance", async ({ page }) => {
  const disabled = { currentVersion: null, effectiveAt: null, enforcementEnabled: false };
  await routeFixture(page, "author", {
    "/api/authors/me/publishing-terms": { ...disabled, accepted: false, requiresAcceptance: false },
  });
  await page.goto("/author/manuscripts/new");
  await expect(page.getByRole("button", { name: "Submit Manuscript", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "I accept the current publishing terms" })).toHaveCount(0);
});

test("mocked author analytics sends inclusive UTC dates and displays known royalty for partial data", async ({ page }) => {
  await routeFixture(page, "author", {
    "/api/authors/me/analytics": {
      bounds: { from: "2026-11-01T00:00:00.000Z", to: "2026-11-30T23:59:59.999Z", timezone: "UTC", inclusion: "inclusive" },
      summary: { units: 20, revenue: 9980, knownRoyalty: 120.5, orderCount: 8, saleLineCount: 12, unresolvedLegacyCount: 2, currency: "USD", dataStatus: "PARTIAL" },
      series: [],
    },
  });
  await page.goto("/author/analytics");
  await expect(page.getByRole("heading", { name: "Performance & Analytics" })).toBeVisible();
  await page.getByLabel("Start date (UTC)").fill("2026-11-01");
  await page.getByLabel("End date (UTC)").fill("2026-11-30");
  const query = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith("/authors/me/analytics") && url.searchParams.has("from");
  });
  await page.getByRole("button", { name: "Apply dates" }).click();
  const params = new URL((await query).url()).searchParams;
  expect(Object.fromEntries(params)).toEqual({ from: "2026-11-01T00:00:00.000Z", to: "2026-11-30T23:59:59.999Z" });
  await expect(page.getByText("Partial", { exact: true })).toBeVisible();
  await expect(page.getByText(/\$120\.50/)).toBeVisible();
  await expect(page.getByText("Unresolved legacy lines")).toBeVisible();
});

test("mocked admin monitoring shows metrics and readiness and refreshes on demand", async ({ page }) => {
  await routeFixture(page, "admin", {
    "/api/admin/operations/runtime-metrics": {
      uptimeSeconds: 320, requests: { total: 37, inFlight: 1, statusClasses: { "2xx": 37 }, sampleSize: 37,
        durationMs: { average: 9, p50: 8, p95: 13, p99: 20 } },
      memoryBytes: { rss: 3670016 },
    },
    "/health/ready": { status: "READY" },
  });
  await page.goto("/admin/system");
  await expect(page.getByRole("heading", { name: "System monitoring" })).toBeVisible();
  await expect(page.getByText("Backend is ready")).toBeVisible();
  await expect(page.getByText("20.0 ms")).toBeVisible();
  await expect(page.getByText("3.5 MiB")).toBeVisible();
  await expect(page.getByText("HTTP 2xx")).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  const refresh = page.waitForRequest("**/api/admin/operations/runtime-metrics");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await refresh;
});

test("royalty author lookup pages beyond the first 100 and preserves email search characters", async ({ page }) => {
  await routeFixture(page, "admin", {});
  const email = "a.writer+publisher@example.invalid";
  await page.route("**/api/admin/users?**", async (route) => {
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization",
      "access-control-allow-methods": "GET, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const params = new URL(route.request().url()).searchParams;
    const pageNumber = Number(params.get("page"));
    const search = params.get("search");
    expect(params.get("role")).toBe("author");
    expect(params.get("limit")).toBe("25");
    const matches = search === null || search === email;
    return route.fulfill({ headers, json: {
      success: true,
      data: matches ? [{ _id: "b".repeat(24), name: search || pageNumber === 5 ? "Author after 100" : `Author page ${pageNumber}`, email }] : [],
      pagination: { page: pageNumber, limit: 25, pages: search ? (matches ? 1 : 0) : 5, total: search ? (matches ? 1 : 0) : 101 },
    } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/royalties");
  const pages = page.getByRole("navigation", { name: "Author search pages" });
  for (let index = 1; index < 5; index++) {
    await expect(pages).toContainText(`Page ${index} of 5`);
    await pages.getByRole("button", { name: "Next" }).click();
  }
  await expect(pages).toContainText("Page 5 of 5");
  await page.getByRole("textbox", { name: "Search authors" }).fill(email);
  await expect(pages).toHaveCount(0);
  await expect(page.getByText("Searching authors…")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Statement author" }).click();
  await expect(page.getByRole("option", { name: `Author after 100 · ${email}` })).toBeVisible();
});

test("home links published categories to the existing catalog on mobile", async ({ page }) => {
  await routeFixture(page, "author", {
    "/api/categories": [
      { _id: "active", name: "Local histories", slug: "local-histories", active: true },
      { _id: "inactive", name: "Hidden category", slug: "hidden", active: false },
    ],
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  const categories = page.getByRole("region", { name: "Browse by category" });
  await expect(categories.getByRole("link", { name: "Local histories" })).toHaveAttribute("href", "/books?category=local-histories");
  await expect(categories.getByText("Hidden category")).toHaveCount(0);
});

test("mocked shipment tracking offers only the available provider", async ({ page }) => {
  const manual = { provider: "manual", label: "Manual courier", available: true, mode: "MANUAL",
    status: "CONFIGURED", supportsAutomaticBooking: false, supportsManualTracking: true };
  await routeFixture(page, "admin", {
    "/api/admin/shipments": { shipments: [{ _id: "bbbbbbbbbbbbbbbbbbbbbbbb", shipmentNumber: "SHP-FIXTURE", status: "CREATED" }] },
    "/api/admin/shipments/couriers": { providers: [manual, { ...manual, provider: "other", label: "Other carrier", available: false }] },
  });
  await page.goto("/admin/shipments");
  await page.getByRole("button", { name: "Assign Courier" }).click();
  const provider = page.getByLabel("Courier provider");
  await expect(provider.locator("option")).toHaveCount(2);
  await provider.selectOption("manual");
  await expect(page.getByRole("textbox", { name: "Courier service" })).toBeEditable();
});
