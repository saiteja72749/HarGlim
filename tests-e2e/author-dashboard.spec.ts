import { test, expect } from './fixtures';
import { backendData, backendGet, backendList, backendURL, loginBackend, logoutBackend, type BackendSession } from './backend';

// Real authentication must never be written into browser traces.
test.use({ trace: 'off', screenshot: 'off' });
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
  await expect(page.getByRole('heading', { name: 'Author Studio Overview', exact: true })).toBeVisible();
  await expect(page.getByText('Published books', { exact: true }).locator('..').locator('dd').first()).toHaveText(Number(summary.books.published).toLocaleString('en-IN'));
  await expect(page.getByText('Copies sold', { exact: true }).locator('..').locator('dd').first()).toHaveText(Number(summary.sales.unitsSold).toLocaleString('en-IN'));
  await expect(page.getByRole('alert').filter({ hasText: /couldn't load|expired|not active/i })).toHaveCount(0);
});

test('author catalog shows actual assigned books', async ({ page }) => {
  const books = backendList(await backendGet('/authors/me/books?page=1&limit=12', session), 'books');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/author/books', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Books' })).toBeVisible();
  if (books.length === 0) await expect(page.getByText('No books match your filters.')).toBeVisible();
  for (const book of books) await expect(page.getByRole('row').filter({ hasText: book.title }).first()).toBeVisible();
});

test('author book reads reject a public title owned by another author', async () => {
  const ownedBooks = backendList(await backendGet('/authors/me/books?page=1&limit=1', session), 'books');
  test.skip(!ownedBooks[0]?._id, 'A live title owned by the test author is required.');
  const ownId = ownedBooks[0]._id;
  await backendGet(`/authors/me/books/${encodeURIComponent(ownId)}`, session);

  const publicBooks = backendList(await backendGet('/books?limit=100'), 'books');
  const authorId = session.user._id || session.user.id;
  const other = publicBooks.find((book) => {
    const owner = typeof book.author === 'string' ? book.author : book.author?._id;
    return book._id && book._id !== ownId && typeof owner === 'string' && /^[a-f0-9]{24}$/i.test(owner) && owner !== authorId;
  });
  test.skip(!other, 'A live title with a different public author ID is required.');
  const response = await fetch(`${backendURL}/authors/me/books/${encodeURIComponent(other._id)}`, {
    headers: { Authorization: `Bearer ${session.token}` },
    signal: AbortSignal.timeout(30_000),
  });
  expect([403, 404]).toContain(response.status);
});

test('author navigation opens real manuscript and profile pages', async ({ page }) => {
  await page.goto('/author', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Submit Manuscript', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submit New Manuscript' })).toBeVisible();
  await page.getByRole('link', { name: 'Author Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile & Payment Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: session.user.name, exact: true })).toBeVisible();
});

test('author analytics uses the real selected date range', async ({ page }) => {
  const analytics = backendData(await backendGet('/authors/me/analytics?range=30d', session));
  expect(Array.isArray(analytics.series)).toBe(true);
  const units = analytics.totals?.unitsSold ?? analytics.summary?.unitsSold ?? analytics.unitsSold ?? (analytics.series.length ? null : 0);
  await page.goto('/author/analytics', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Performance & Analytics' })).toBeVisible();
  await expect(page.getByText('Units Sold', { exact: true }).first().locator('..').locator('p').nth(1)).toHaveText(units == null ? 'Unavailable' : units.toLocaleString('en-IN'));
  const response = page.waitForResponse((res) => res.url().includes('/authors/me/analytics?range=7d'));
  await page.getByRole('button', { name: '7 days', exact: true }).click();
  expect((await response).ok()).toBe(true);
});

test('real royalty totals and CSV export agree with backend history', async ({ page }) => {
  const royalties = backendData(await backendGet('/authors/me/royalties?page=1&limit=100', session));
  await page.goto('/author/royalties', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Royalty Earnings & Settlements' })).toBeVisible();
  const total = Number(royalties.accruedKnown ?? royalties.accruedTotal ?? royalties.balance);
  await expect(page.getByText('Total Lifetime Royalties', { exact: true }).locator('..').locator('dd').first()).toHaveText(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total));
  if (royalties.history.length) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('author_royalties_statement.csv');
    expect(await download.failure()).toBeNull();
  } else await expect(page.getByText('No book sales records logged yet.')).toBeVisible();
});

test('publisher statements and payout settlements load from real APIs', async ({ page }) => {
  const statements = backendList(await backendGet('/authors/me/manual-royalties?limit=100', session), 'statements');
  const settlements = backendList(await backendGet('/authors/me/royalty-settlements?limit=100', session), 'settlements');
  await page.goto('/author/royalties#settlements', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: `Payout History (${settlements.length})` })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: `Publisher Statements (${statements.length})` }).click();
  await expect(page.getByRole('tab', { name: `Publisher Statements (${statements.length})` })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('alert').filter({ hasText: /couldn't load/i })).toHaveCount(0);
});

test('real author dashboard fits mobile and opens navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/author', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Author Studio Overview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open author navigation' }).click();
  await expect(page.getByRole('link', { name: 'My Books', exact: true })).toBeVisible();
});

test('an author account exposes exactly the four intended actions and the Studio drawer restores focus', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: /^Account for / });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem')).toHaveText(['Author Studio', 'My Orders', 'Profile Settings', 'Sign Out']);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/author');
  const drawer = page.getByRole('button', { name: 'Open author navigation' });
  await drawer.focus();
  await page.keyboard.press('Enter');
  const nav = page.getByRole('dialog').getByRole('navigation', { name: 'Author Studio' });
  await expect(nav.getByRole('link')).toHaveText(['Overview', 'My Books', 'Submit Manuscript', 'Manuscripts', 'Performance & Analytics', 'Royalties', 'Author Profile']);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeFocused();
});

test('Studio pages fit every required viewport and the public preview uses the authenticated identity', async ({ page }) => {
  test.setTimeout(240_000);
  for (const path of ['/author', '/author/books', '/author/manuscripts', '/author/manuscripts/new', '/author/analytics', '/author/royalties', '/author/settings']) {
    await test.step(path, async () => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      if (path.endsWith('settings')) {
        const identity = session.user._id || session.user.id;
        await expect(page.getByRole('link', { name: 'Preview public profile and books' })).toHaveAttribute('href', '/authors/' + identity);
        const details = backendData(await backendGet('/authors/me/payment-details', session));
        if (/^[*xX-]+\d{1,4}$/.test(details?.accountNumberMasked || "")) {
          await expect(page.getByText(/^[*xX-]+\d{1,4}$/)).toBeVisible();
        }
        await expect(page.locator('input#accountNumber')).toHaveCount(0);
      }
      for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 850 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} at ${width}px`).toBeLessThanOrEqual(width);
      }
    });
  }
});
