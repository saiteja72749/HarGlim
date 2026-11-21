import { test, expect } from './fixtures';

/**
 * Read-only smoke tests against the real site (dev server → live backend).
 * These only navigate and assert visible content — no form submission that
 * would create orders, accounts, or payments against production data.
 *
 * Navigations wait on `domcontentloaded` rather than the default `load`:
 * the `load` event blocks on every sub-resource (third-party analytics,
 * external cover images), which is the wrong signal for "did the page
 * render" and makes the suite flaky on a slow network/disk. The `expect`
 * assertions below are the real correctness check and already retry.
 */

test.describe('Public navigation', () => {
  test('home page loads with a hero heading and nav', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('books catalog page loads and lists books or an empty state', async ({ page }) => {
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /books catalog/i })).toBeVisible();
    // Wait for an actual result rather than passing while loading skeletons are visible.
    await expect(page.locator('a[href^="/books/"]').first().or(page.getByRole('heading', { name: /no books found/i }))).toBeVisible({ timeout: 50_000 });
  });

  test('navigating to a book from the catalog opens a detail page', async ({ page }) => {
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    const firstBookLink = page.locator('a[href^="/books/"]').first();
    const empty = page.getByRole('heading', { name: /no books found/i });
    await expect(firstBookLink.or(empty)).toBeVisible({ timeout: 50_000 });
    test.skip(await empty.isVisible(), 'No books returned by the backend to click through.');
    await firstBookLink.click();
    await expect(page).toHaveURL(/\/books\/.+/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('login page renders the credential form', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('register page renders the sign-up form', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test('login rejects an empty submit without calling the API', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    let loginRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/auth/login')) loginRequests++;
    });
    await page.getByRole('button', { name: 'Sign In with Password', exact: true }).click();
    // Should stay on the login page — no navigation away on empty/invalid submit.
    await expect(page).toHaveURL(/\/login/);
    expect(loginRequests).toBe(0);
  });

  test('an unknown route renders the branded 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/404|not been published/i).first()).toBeVisible();
  });

  for (const path of [
    '/about', '/contact', '/faq', '/terms', '/privacy', '/publish',
    '/author-guidelines', '/royalty-info', '/spotlight', '/returns', '/careers',
    '/authors', '/categories', '/track-order', '/forgot-password', '/reset-password',
  ]) {
    test(`${path} renders its page heading`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }

  test('search page accepts a query without erroring', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    const response = page.waitForResponse((res) => {
      const url = new URL(res.url());
      return url.pathname.endsWith('/api/search') && url.searchParams.get('q') === 'book';
    });
    await page.getByRole('searchbox').fill('book');
    expect((await response).ok()).toBe(true);
    await expect(page.getByRole('heading', { name: 'Search Books', exact: true })).toBeVisible();
  });
});

test.describe('Cart (client-side only, no checkout submission)', () => {
  test('cart page renders an empty-cart state for a fresh session', async ({ page }) => {
    await page.goto('/checkout/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  });
});

test.describe('Protected routes without a session', () => {
  for (const path of ['/author', '/author/books', '/admin', '/dashboard/orders']) {
    test(`${path} requires login and preserves the destination`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}`, 'i'));
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
    });
  }
});
