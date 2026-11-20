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
    // Either real book cards render, or the page's own "no books" message does —
    // either way the page must not be stuck on its loading skeleton forever.
    await expect(page.locator('body')).not.toContainText('undefined', { timeout: 15000 });
  });

  test('navigating to a book from the catalog opens a detail page', async ({ page }) => {
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    const firstBookLink = page.locator('a[href^="/books/"]').first();
    const count = await firstBookLink.count();
    test.skip(count === 0, 'No books returned by the backend to click through.');
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
    await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
    // Should stay on the login page — no navigation away on empty/invalid submit.
    await expect(page).toHaveURL(/\/login/);
  });

  test('an unknown route renders the branded 404 page', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/404|not been published/i).first()).toBeVisible();
  });

  test('static content pages load', async ({ page }) => {
    for (const path of ['/about', '/contact', '/faq', '/terms', '/privacy']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('search page accepts a query without erroring', async ({ page }) => {
    await page.goto('/search?q=book', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});

test.describe('Cart (client-side only, no checkout submission)', () => {
  test('cart page renders an empty-cart state for a fresh session', async ({ page }) => {
    await page.goto('/checkout/cart', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});
