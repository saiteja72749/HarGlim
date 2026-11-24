import { expect, test, type Page } from "@playwright/test";

const readerId = "100000000000000000000001";
const bookId = "100000000000000000000002";
const orderId = "100000000000000000000003";
const reader = { _id: readerId, name: "Test Reader", email: "reader@example.invalid", role: "reader", isActive: true };
const book = { _id: bookId, title: "Fixture book", slug: "fixture-book", price: 400, format: "paperback", stock: 5 };
const viewportWidths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

async function mockReader(page: Page, options: { orderError?: boolean; paidAccess?: boolean } = {}) {
  await page.addInitScript(({ reader, book }) => {
    if (!localStorage.getItem("auth-storage")) {
      localStorage.setItem("auth-storage", JSON.stringify({ state: { user: reader, token: "fixture-token", isAuthenticated: true }, version: 0 }));
    }
    if (!localStorage.getItem("cart-storage")) {
      localStorage.setItem("cart-storage", JSON.stringify({ state: { items: [{ book, quantity: 1 }] }, version: 0 }));
    }
  }, { reader, book });

  const requests = { orders: 0, utr: 0, addresses: 0 };
  let submitted = false;
  let paymentVerified = false;
  let savedReader = reader;
  const corsHeaders = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
  };
  const order = { _id: orderId, orderNumber: "TEST-ORDER", totalPrice: 475, shippingPrice: 75, isPaid: false, items: [{ book, quantity: 1 }] };
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers: corsHeaders, json: { success: status < 400, data } });
    if (pathname.endsWith("/users/me/context")) return json({
      user: savedReader, capabilities: { canPublish: false, canAccessAuthorDashboard: false, canAdminister: false },
      features: { paidAuthorDashboardAccess: options.paidAccess === true },
    });
    if (pathname.endsWith("/authors/me/dashboard-access")) return json({
      state: "NOT_PURCHASED",
      purchase: { _id: "test-purchase", status: "PENDING" },
    });
    if (pathname.endsWith("/users/me/addresses")) {
      if (method === "PUT") requests.addresses++;
      return json([]);
    }
    if (pathname.endsWith("/users/me")) return json(savedReader);
    if (pathname.endsWith(`/users/${readerId}`) && method === "PUT") {
      savedReader = { ...savedReader, ...route.request().postDataJSON() };
      return json(savedReader);
    }
    if (pathname.endsWith("/orders") && method === "POST") {
      requests.orders++;
      expect(route.request().postDataJSON()).toMatchObject({ items: [{ book: bookId, quantity: 1 }], paymentMethod: "UPI" });
      if (options.orderError) return json(null, 500);
      return json({ order, payment: { amount: 475, upiUrl: "upi://pay?pa=fixture%40example&pn=Fixture%20Merchant&am=475.00" } }, 201);
    }
    if (pathname.endsWith("/verify-payment") && method === "PUT") {
      requests.utr++;
      expect(route.request().postDataJSON()).toEqual({ utr: "EXAMPLE-123" });
      submitted = true;
      return json({ status: "VERIFICATION_PENDING" });
    }
    if (pathname.endsWith("/orders")) return json(requests.orders && !options.orderError ? [{ ...order, utr: submitted ? "EXAMPLE-123" : undefined }] : []);
    if (pathname.endsWith("/payments") && submitted) return json([{ order: orderId, status: paymentVerified ? "PAYMENT_VERIFIED" : "VERIFICATION_PENDING", amount: 475, utr: "EXAMPLE-123" }]);
    if (pathname.endsWith("/content")) return json({ homeTitle: "You write, we print. You dream, we publish." });
    if (pathname.endsWith("/author-application")) return json(null);
    return json([]);
  });
  return { requests, verifyPayment: () => { paymentVerified = true; } };
}

async function fillAddress(page: Page) {
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByLabel("Address line 1").fill("12 Example Road");
  await page.getByLabel("City").fill("Hyderabad");
  await page.getByLabel("State or province").fill("Telangana");
  await page.getByLabel("PIN or postal code").fill("500038");
}

test("manual UPI checkout uses the server total and a UTR remains pending", async ({ page }) => {
  const { requests, verifyPayment } = await mockReader(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/checkout/checkout");
  await fillAddress(page);
  await expect(page.getByRole("checkbox", { name: "Save this as my default address" })).not.toBeChecked();
  await page.getByLabel("PIN or postal code").fill("00000");
  await page.getByRole("button", { name: "Confirm Order" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("six-digit PIN");
  expect(requests.orders).toBe(0);
  await page.getByLabel("PIN or postal code").fill("500038");
  await page.getByRole("button", { name: "Confirm Order" }).dblclick();
  await expect(page.getByRole("heading", { name: "Complete payment" })).toBeVisible();
  await expect(page.getByText(/Amount payable.*475/)).toBeVisible();
  await expect(page.getByText("Fixture Merchant")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open UPI app" })).toHaveAttribute("href", "upi://pay?pa=fixture%40example&pn=Fixture%20Merchant&am=475.00");
  const utr = page.getByLabel("UPI transaction reference (UTR)");
  await utr.fill("bad!");
  await page.getByRole("button", { name: "Submit UTR for verification" }).click();
  expect(requests.utr).toBe(0);
  await utr.fill("example-123");
  await page.getByRole("button", { name: "Submit UTR for verification" }).dblclick();
  await expect(page.getByRole("status")).toContainText("Payment details submitted. Awaiting verification.");
  expect(requests).toEqual({ orders: 1, utr: 1, addresses: 0 });
  await expect(page.getByRole("link", { name: "View in My Orders" })).toHaveAttribute("href", new RegExp(orderId));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(orderId));
  await expect(page.getByRole("heading", { name: "Verification Pending" })).toBeVisible();
  await expect(page.getByText("Payment Verified", { exact: true })).toHaveCount(0);
  verifyPayment();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Payment Verified" })).toBeVisible();
});

test("an ambiguous order result prompts reconciliation before another order", async ({ page }) => {
  const { requests } = await mockReader(page, { orderError: true });
  await page.goto("/checkout/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: "Confirm Order" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Check My Orders");
  await expect(page.getByRole("button", { name: "Confirm Order" })).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.setItem("cart-storage", JSON.stringify({ state: { items: [] }, version: 0 }));
  });
  await page.reload();
  await expect(page.getByRole("link", { name: "Check My Orders" })).toHaveAttribute("href", "/dashboard/orders");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Check My Orders");
  expect(requests.orders).toBe(1);
});

test("paid author access requires server payment details", async ({ page }) => {
  const { requests } = await mockReader(page, { paidAccess: true });
  await page.goto("/dashboard/purchase-access");
  await expect(page.getByText("Price unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("The payment QR code is unavailable.")).toBeVisible();
  await expect(page.getByText("Payable amount unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit UTR Reference" })).toBeDisabled();
  await expect(page.getByText("harglim@upi")).toHaveCount(0);
  expect(requests.utr).toBe(0);
});

test("keyboard site and reader menus dismiss and return focus", async ({ page }) => {
  await mockReader(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/dashboard/profile");
  const name = page.getByLabel("Full Name");
  await expect(name).not.toBeEditable();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(name).toBeEditable();
  await name.fill("Changed name");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(name).toHaveValue(reader.name);
  for (const label of ["Toggle menu", "Open reader navigation"]) {
    const button = page.getByRole("button", { name: label });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(button).toBeFocused();
  }
  const account = page.getByRole("button", { name: "Account for Test Reader" });
  await account.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Reader Dashboard" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await name.fill("Confirmed Reader");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(name).toHaveValue("Confirmed Reader");
  await expect(name).not.toBeEditable();
});

test("Phase 1 storefront and reader screens fit all requested widths", async ({ page }) => {
  test.setTimeout(180_000);
  await mockReader(page);
  for (const path of ["/", "/books", "/authors", "/publish", "/about", "/contact", "/cart", "/checkout/checkout", "/dashboard", "/dashboard/orders", "/dashboard/wishlist", "/dashboard/library", "/dashboard/payments", "/dashboard/profile", "/dashboard/become-author"]) {
    await test.step(path, async () => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 850 });
        const size = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
        expect(size.page, `${path} at ${width}px`).toBeLessThanOrEqual(size.viewport);
      }
    });
  }
});

test("icon is served and linked from the home page", async ({ request }) => {
  const icon = await request.get("/favicon.ico");
  expect(icon.ok()).toBe(true);
  expect((await icon.body()).readUInt16LE(2)).toBe(1);
  const response = await request.get("/");
  expect(await response.text()).toMatch(/<link[^>]+rel="icon"[^>]+href="\/favicon\.ico/);
});
