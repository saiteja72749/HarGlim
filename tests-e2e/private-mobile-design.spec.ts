import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync } from 'node:fs';

// Real credentials and private UI must not be captured in browser traces.
test.use({ trace: 'off' });

const groups = [
  { role: 'AUTHOR', landing: '/author', routes: ['/author', '/author/books', '/author/manuscripts', '/author/manuscripts/new', '/author/analytics', '/author/royalties', '/author/settings'] },
  { role: 'ADMIN', landing: '/admin', routes: ['/admin', '/admin/analytics', '/admin/author-access', '/admin/author-applications', '/admin/authors', '/admin/books', '/admin/books/new', '/admin/categories', '/admin/content', '/admin/inventory', '/admin/invoices', '/admin/manuscripts', '/admin/notifications', '/admin/orders', '/admin/packages', '/admin/payments', '/admin/reviews', '/admin/royalties', '/admin/settlements', '/admin/shipments', '/admin/spotlights', '/admin/users'] },
] as const;

for (const group of groups) test(`${group.role.toLowerCase()} mobile screens remain usable with a genuine session`, async ({ page }) => {
  test.setTimeout(480_000);
  const email = process.env[`E2E_${group.role}_EMAIL`];
  const password = process.env[`E2E_${group.role}_PASSWORD`];
  test.skip(!email || !password, `No authorized ${group.role.toLowerCase()} credentials are configured.`);
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email!);
  await page.getByLabel(/password/i).first().fill(password!);
  await page.getByRole('button', { name: 'Sign In with Password', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${group.landing}$`), { timeout: 45_000 });
  const screens: { route: string; width: number; title: string }[] = [];
  for (const path of group.routes) await test.step(path, async () => {
    await page.waitForTimeout(5000); // Shared live API budget; no data or HTTP interception.
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(new URL(page.url()).pathname, 'The guard must authorize this actual screen').toBe(path);
    expect(await page.locator('main').count(), `${path}: main landmark`).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal overflow`).toBe(true);
    expect(await page.locator('a button, button a').count(), `${path}: nested controls`).toBe(0);
    screens.push({ route: path, width: 320, title: await page.title() });
  });
  mkdirSync('test-suite-results', { recursive: true });
  writeFileSync(`test-suite-results/${group.role.toLowerCase()}-mobile-screen-results.json`, JSON.stringify({ status: 'passed', screens }, null, 2));
  // Revoke this test's own session through the existing UI; no business writes.
  await page.getByRole('button', { name: group.role === 'AUTHOR' ? 'Open author navigation' : 'Open admin navigation' }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
