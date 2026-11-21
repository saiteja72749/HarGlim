import { test, expect } from './fixtures';
import { backendData, backendGet, backendList, loginBackend, logoutBackend, type BackendSession } from './backend';

// Real authentication must never be written into browser traces.
test.use({ trace: 'off' });
let session: BackendSession;

test.beforeAll(async () => {
  session = await loginBackend('AUTHOR');
  const context = backendData(await backendGet('/users/me/context', session));
  expect(context.user.role).toBe('author');
  expect(context.capabilities.canAccessAuthorDashboard).toBe(true);
});

test.afterAll(async () => { if (session) await logoutBackend(session); });

test.beforeEach(async ({ page }) => {
  await page.addInitScript((auth) => {
    localStorage.setItem('auth-storage', JSON.stringify({ version: 0, state: {
      ...auth,
      user: { ...auth.user, _id: auth.user._id || auth.user.id },
      isAuthenticated: true,
    } }));
  }, session);
});

test('author dashboard matches the real backend totals', async ({ page }) => {
  const summary = backendData(await backendGet('/authors/me/dashboard', session));
  await page.goto('/author', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Author Workspace', exact: true })).toBeVisible();
  await expect(page.getByText('Total Books', { exact: true }).locator('..').locator('p').first()).toHaveText(Number(summary.books.total).toLocaleString('en-IN'));
  await expect(page.getByText('Copies Sold', { exact: true }).locator('..').locator('p').first()).toHaveText(Number(summary.sales.unitsSold).toLocaleString('en-IN'));
  await expect(page.getByRole('alert').filter({ hasText: /couldn't load|expired|not active/i })).toHaveCount(0);
});

test('author catalog shows actual assigned books', async ({ page }) => {
  const books = backendList(await backendGet('/authors/me/books?limit=100', session), 'books');
  await page.goto('/author/books', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Author Books' })).toBeVisible();
  if (books.length === 0) await expect(page.getByRole('heading', { name: 'No books found' })).toBeVisible();
  for (const book of books) await expect(page.getByRole('row').filter({ hasText: book.title }).first()).toBeVisible();
});

test('author navigation opens real manuscript and profile pages', async ({ page }) => {
  await page.goto('/author', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Add Book', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submit New Manuscript' })).toBeVisible();
  await page.getByRole('link', { name: 'Author Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile & Payment Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: session.user.name, exact: true })).toBeVisible();
});

test('author analytics uses the real selected date range', async ({ page }) => {
  const analytics = backendData(await backendGet('/authors/me/analytics?range=30d', session));
  expect(Array.isArray(analytics.series)).toBe(true);
  const units = analytics.series.reduce((total: number, row: any) => total + Number(row.units ?? row.unitsSold ?? row.quantity ?? 0), 0);
  await page.goto('/author/analytics', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Author Analytics' })).toBeVisible();
  await expect(page.getByText('Units Sold', { exact: true }).first().locator('..').locator('p').nth(1)).toHaveText(units.toLocaleString('en-IN'));
  const response = page.waitForResponse((res) => res.url().includes('/authors/me/analytics?range=7d'));
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  expect((await response).ok()).toBe(true);
});

test('real royalty totals and CSV export agree with backend history', async ({ page }) => {
  const royalties = backendData(await backendGet('/authors/me/royalties?page=1&limit=100', session));
  await page.goto('/author/royalties', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Royalty Earnings & Settlements' })).toBeVisible();
  const total = Number(royalties.accruedKnown ?? royalties.accruedTotal ?? royalties.balance);
  await expect(page.getByText('Total Lifetime Royalties', { exact: true }).locator('..').locator('p').first()).toHaveText(`₹${total.toLocaleString('en-IN')}`);
  if (royalties.history.length) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('author_royalties_statement.csv');
    expect(await download.failure()).toBeNull();
  } else await expect(page.getByText('No book sales records logged yet.')).toBeVisible();
});

test('publisher statements and payout settlements load from real APIs', async ({ page }) => {
  const statements = backendList(await backendGet('/authors/me/manual-royalties?limit=100', session), 'statements').filter((statement) => statement.status !== 'VOID');
  const settlements = backendList(await backendGet('/authors/me/royalty-settlements?limit=100', session), 'settlements');
  await page.goto('/author/royalties#settlements', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: `Payout Settlements (${settlements.length})` })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: `Publisher Statements (${statements.length})` }).click();
  await expect(page.getByRole('tab', { name: `Publisher Statements (${statements.length})` })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('alert').filter({ hasText: /couldn't load/i })).toHaveCount(0);
});

test('real author dashboard fits mobile and opens navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/author', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Author Workspace', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open author navigation' }).click();
  await expect(page.getByRole('link', { name: 'My Books', exact: true })).toBeVisible();
});
