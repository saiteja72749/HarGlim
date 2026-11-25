import { expect, test } from '@playwright/test';
import { INITIAL_CATEGORY_NAMES } from '../tools/category-seed-data.mjs';

const admin = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Layout Test', email: 'layout@example.invalid', role: 'admin', isActive: true };
const orders = Array.from({ length: 20 }, (_, index) => ({
  _id: (index + 1).toString(16).padStart(24, '0'),
  orderNumber: `ORDER-LAYOUT-${index + 1}`,
  customerName: 'A customer name long enough to wrap',
  customerEmail: 'longcustomeraddressfortheviewporttest@example.invalid',
  totalAmount: 250,
  paymentStatus: 'VERIFIED',
  status: 'PROCESSING',
  items: [],
}));

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(testInfo.project.use.baseURL || ''), 'Layout fixtures are local only.');
  await page.addInitScript((user) => localStorage.setItem('auth-storage', JSON.stringify({
    version: 0, state: { user, token: 'layout-test-token', isAuthenticated: true },
  })), admin);
  await page.route('**/api/**', (route) => {
    const { pathname } = new URL(route.request().url());
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (route.request().method() !== 'GET') return route.abort();
    const data = pathname.endsWith('/users/me/context')
      ? { user: admin, capabilities: { canAdminister: true, canPublish: false, canAccessAuthorDashboard: false } }
      : pathname.endsWith('/admin/orders') ? { orders }
      : pathname.endsWith('/users/me') ? admin
      : pathname.endsWith('/admin/content') || pathname.endsWith('/admin/dashboard') ? {} : [];
    return route.fulfill({ headers, json: { success: true, data } });
  });
});

test('standard category import saves only missing names and can be repeated', async ({ page }) => {
  const rows = INITIAL_CATEGORY_NAMES.filter(name => name !== 'Academic').map((name, index) => ({
    _id: (index + 1).toString(16).padStart(24, '0'),
    name: name === "Children's Books" ? 'Children Books' : name === 'Self-Help' ? 'Self Help' : name,
    active: name !== 'Poetry',
  }));
  const writes: string[] = [];
  await page.route(url => url.pathname.endsWith('/api/admin/categories'), route => {
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    };
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.method() === 'POST') {
      const { name, active } = request.postDataJSON();
      writes.push(name);
      const category = { _id: (rows.length + 1).toString(16).padStart(24, '0'), name, active };
      rows.push(category);
      return route.fulfill({ status: 201, headers, json: { success: true, data: category } });
    }
    const active = new URL(request.url()).searchParams.get('active') === 'true';
    return route.fulfill({ headers, json: { success: true, data: rows.filter(row => row.active === active) } });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/categories');
  const importButton = page.getByRole('button', { name: 'Import Standard Categories' });
  for (let attempt = 0; attempt < 2; attempt++) {
    await importButton.click();
    await expect(importButton).toBeEnabled();
    await expect(page.getByText('63 of 63 standard categories are in the backend.', { exact: false })).toBeVisible();
  }
  expect(writes).toEqual(['Academic']);
  await expect(page.getByText('Academic', { exact: true })).toBeVisible();
  await expect(page.getByText('1 already exist as inactive.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('order actions remain visible inside the Admin scroll region', async ({ page }) => {
  test.setTimeout(100_000);
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' });
    const region = page.getByRole('region', { name: 'Orders and payment verification' });
    await expect(region.getByRole('row').filter({ hasText: 'ORDER-LAYOUT-1' }).first()).toBeVisible();
    const action = region.getByRole('button', { name: 'Mark Printed', exact: true }).first();
    const actionBox = (await action.boundingBox())!;
    const regionBox = (await region.boundingBox())!;
    expect(actionBox.x, `Action left at ${width}px`).toBeGreaterThanOrEqual(regionBox.x - 1);
    expect(actionBox.x + actionBox.width, `Action right at ${width}px`).toBeLessThanOrEqual(regionBox.x + regionBox.width + 1);
    expect(await region.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Page width at ${width}px`).toBeLessThanOrEqual(width);
  }

  for (const path of ['/admin/analytics', '/admin/notifications']) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toBe('/admin');
  }
});

test('Admin workspaces fit on mobile', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflowing: string[] = [];
  for (const path of ['/admin', '/admin/payments', '/admin/shipments', '/admin/inventory', '/admin/books',
    '/admin/categories', '/admin/packages', '/admin/spotlights', '/admin/manuscripts', '/admin/reviews',
    '/admin/content', '/admin/users', '/admin/authors', '/admin/author-applications', '/admin/author-access',
    '/admin/royalties', '/admin/invoices']) {
    await test.step(path, async () => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (pageWidth > 390) overflowing.push(`${path} (${pageWidth}px)`);
    });
  }
  expect(overflowing).toEqual([]);
});
