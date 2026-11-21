import { test, expect } from './fixtures';
import { backendURL, loginBackend, logoutBackend, type BackendSession } from './backend';

test.use({ trace: 'off' });
let author: BackendSession;
test.beforeAll(async () => { author = await loginBackend('AUTHOR'); });
test.afterAll(async () => { if (author) await logoutBackend(author); });

test('the backend rejects unauthenticated access to private author data', async () => {
  for (const path of ['/users/me/context', '/authors/me/payment-details', '/authors/me/royalties']) {
    const response = await fetch(`${backendURL}${path}`, { signal: AbortSignal.timeout(45_000) });
    expect(response.status).toBe(401);
  }
});

test('a real author session cannot access admin collections', async () => {
  for (const path of ['/admin/dashboard', '/admin/users?limit=1', '/admin/orders?limit=1']) {
    const response = await fetch(`${backendURL}${path}`, { headers: { Authorization: `Bearer ${author.token}` }, signal: AbortSignal.timeout(45_000) });
    expect(response.status).toBe(403);
  }
});

test('CMS cache refresh rejects signed-out and author sessions', async ({ request }) => {
  expect((await request.post('/api/content/revalidate')).status()).toBe(401);
  expect((await request.post('/api/content/revalidate', { headers: { Authorization: `Bearer ${author.token}` } })).status()).toBe(403);
});

test('financial reads prohibit response caching and do not expose a full bank account', async () => {
  for (const path of ['/authors/me/payment-details', '/authors/me/royalties']) {
    const response = await fetch(`${backendURL}${path}`, { headers: { Authorization: `Bearer ${author.token}` }, signal: AbortSignal.timeout(45_000) });
    expect(response.ok).toBe(true);
    expect(response.headers.get('cache-control')).toContain('no-store');
    if (path.endsWith('payment-details')) {
      const payload = await response.json();
      const details = payload.data?.paymentDetails ?? payload.data ?? payload;
      expect(details.accountNumber).toBeUndefined();
    }
  }
});

test('the existing public site explains an offline connection', async ({ page, context }) => {
  await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  await context.setOffline(true);
  await expect(page.getByRole('alert').filter({ hasText: 'You are offline.' })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('alert').filter({ hasText: 'You are offline.' })).toHaveCount(0);
});
