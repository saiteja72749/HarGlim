import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';
import { backendURL } from './backend';

// Real credentials and private UI must not be captured in browser artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

const backend = new URL(backendURL);
const apiPrefix = backend.pathname.replace(/\/$/, '');

const groups: ReadonlyArray<{
  role: 'READER' | 'AUTHOR' | 'ADMIN';
  landing: string;
  navigation: string;
  routes: Record<string, RegExp[]>;
}> = [
  { role: 'READER', landing: '/dashboard', navigation: 'reader', routes: {
    '/dashboard': [/\/users\/[^/]+\/orders$/],
    '/dashboard/orders': [/\/users\/[^/]+\/orders$/, /\/users\/[^/]+\/shipments$/, /\/users\/[^/]+\/payments$/],
    '/dashboard/payments': [/\/users\/[^/]+\/payments$/],
    '/dashboard/wishlist': [/\/users\/[^/]+\/wishlist$/],
    '/dashboard/library': [/\/users\/[^/]+\/library$/],
    '/dashboard/profile': [/\/users\/me$/],
    '/dashboard/become-author': [/\/users\/me\/author-application$/],
  } },
  { role: 'AUTHOR', landing: '/author', navigation: 'author', routes: {
    '/author': [/\/authors\/me\/dashboard$/],
    '/author/books': [/\/authors\/me\/books$/],
    '/author/manuscripts': [/\/authors\/me\/books$/],
    '/author/manuscripts/new': [/\/publish-packages$/],
    '/author/analytics': [/\/authors\/me\/analytics$/],
    '/author/royalties': [/\/authors\/me\/manual-royalties$/],
    '/author/settings': [/\/users\/me$/, /\/authors\/me\/payment-details$/],
  } },
  { role: 'ADMIN', landing: '/admin', navigation: 'admin', routes: {
    '/admin': [/\/admin\/dashboard$/],
    '/admin/author-access': [/\/admin\/author-access\/entitlements$/],
    '/admin/author-applications': [/\/admin\/author-applications$/],
    '/admin/authors': [/\/admin\/users$/],
    '/admin/books': [/\/admin\/books$/],
    '/admin/books/new': [/\/admin\/categories$/],
    '/admin/categories': [/\/admin\/categories$/],
    '/admin/content': [/\/admin\/content$/],
    '/admin/inventory': [/\/admin\/operations\/inventory\/low-stock$/],
    '/admin/invoices': [/\/admin\/invoices$/],
    '/admin/manuscripts': [/\/admin\/publish-requests$/],
    '/admin/orders': [/\/admin\/orders$/, /\/admin\/shipments$/],
    '/admin/packages': [/\/admin\/publish-packages$/],
    '/admin/payments': [/\/admin\/operations\/payments$/],
    '/admin/reviews': [/\/admin\/reviews$/],
    '/admin/royalties': [/\/admin\/manual-royalties$/],
    '/admin/settlements': [/\/admin\/royalty-settlements$/],
    '/admin/shipments': [/\/admin\/shipments$/],
    '/admin/spotlights': [/\/admin\/spotlights$/],
    '/admin/users': [/\/admin\/users$/],
  } },
];

for (const group of groups) test(`${group.role.toLowerCase()} mobile screens remain usable with a genuine session`, async ({ page }) => {
  test.setTimeout(480_000);
  const email = process.env[`E2E_${group.role}_EMAIL`];
  const password = process.env[`E2E_${group.role}_PASSWORD`];
  test.skip(!email || !password, `No authorized ${group.role.toLowerCase()} credentials are configured.`);
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto(`/login?redirect=${encodeURIComponent(group.landing)}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email!);
  await page.getByLabel(/password/i).first().fill(password!);
  const [login] = await Promise.all([
    page.waitForResponse(candidate => candidate.request().method() === 'POST' &&
      new URL(candidate.url()).pathname === `${apiPrefix}/auth/login`, { timeout: 45_000 }),
    page.getByRole('button', { name: 'Sign In with Password', exact: true }).click(),
  ]);
  expect(login.ok(), `${group.role} sign-in returned HTTP ${login.status()}`).toBe(true);
  await expect(page).toHaveURL(new RegExp(`${group.landing}$`), { timeout: 45_000 });
  const screens: { route: string; width: number; title: string }[] = [];
  for (const [path, endpoints] of Object.entries(group.routes)) await test.step(path, async () => {
    await page.waitForTimeout(5000); // Shared live API budget; no data or HTTP interception.
    await Promise.all([
      page.goto(path, { waitUntil: 'domcontentloaded' }),
      ...endpoints.map(async (endpoint) => {
        const response = await page.waitForResponse(candidate => {
          const url = new URL(candidate.url());
          return candidate.request().method() === 'GET' && url.origin === backend.origin &&
            url.pathname.startsWith(`${apiPrefix}/`) && endpoint.test(url.pathname.slice(apiPrefix.length));
        }, { timeout: 45_000 });
        if (path === '/dashboard/become-author' && response.status() === 404) return; // No application has been filed.
        expect(response.ok(), `${path}: GET ${endpoint} returned HTTP ${response.status()}`).toBe(true);
        expect((await response.json())?.success, `${path}: backend success flag`).not.toBe(false);
      }),
    ]);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(new URL(page.url()).pathname, 'The guard must authorize this actual screen').toBe(path);
    expect(await page.locator('main').count(), `${path}: main landmark`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal overflow`).toBe(true);
    expect(await page.locator('a button, button a').count(), `${path}: nested controls`).toBe(0);
    screens.push({ route: path, width: 320, title: await page.title() });
  });
  // Revoke this test's own session through the existing UI; no business writes.
  await page.getByRole('button', { name: `Open ${group.navigation} navigation` }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  mkdirSync('test-suite-results', { recursive: true });
  writeFileSync(`test-suite-results/${group.role.toLowerCase()}-mobile-screen-results.json`, JSON.stringify({ status: 'passed', screens }, null, 2));
});
