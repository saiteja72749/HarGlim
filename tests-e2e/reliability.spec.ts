import { test, expect } from './fixtures';

for (const [name, width] of [['mobile', 390], ['tablet', 820], ['desktop', 1440]] as const) {
  test(`catalog controls are usable on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/books', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'Search catalog' })).toBeVisible();
    const list = page.getByRole('button', { name: 'List view', exact: true });
    await list.click();
    await expect(list).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    if (width < 1024) {
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const duplicates = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
        return ids.filter((id, index) => ids.indexOf(id) !== index);
      });
      expect(duplicates).toEqual([]);
      await page.keyboard.press('Escape');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('a button').count()).toBe(0);
  });
}

test('a real search with no matches shows a clear empty state', async ({ page }) => {
  await page.goto('/search?q=release-check-absent-title-20261118-7d0a9c', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/No books match/)).toBeVisible();
});

test('published home content loads on a slow connection', async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 500, downloadThroughput: 200_000, uploadThroughput: 100_000 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/\S/, { timeout: 30_000 });
  await session.detach();
});

test('rapid catalog typing sends only the final debounced search to the real API', async ({ page }) => {
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('textbox', { name: 'Search catalog' });
  await expect(input).toHaveAttribute('aria-busy', 'false');
  const queries: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/api/search')) queries.push(url.searchParams.get('q') || '');
  });
  const response = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/api/search') && url.searchParams.get('q') === 'releasecheckabsent';
  });
  await input.pressSequentially('releasecheckabsent', { delay: 35 });
  expect((await response).status()).toBe(200);
  await expect(input).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByText('No books found matching your criteria')).toBeVisible();
  expect(queries).toEqual(['releasecheckabsent']);
});

test('catalog shows an error offline and retries the real backend after reconnection', async ({ page, context }) => {
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('textbox', { name: 'Search catalog' });
  await expect(input).toHaveAttribute('aria-busy', 'false');
  await context.setOffline(true);
  await input.fill('releasecheckoffline');
  await expect(page.getByText('Unable to load catalog')).toBeVisible();
  await context.setOffline(false);
  const response = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/api/search'));
  await page.getByRole('button', { name: /try again/i }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByText('No books found matching your criteria')).toBeVisible();
});
