import { test, expect } from './fixtures';
import { backendURL } from './backend';
import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('public navigation records a single-browser API request budget', async ({ page, context }) => {
  test.setTimeout(120_000);
  const backend = new URL(backendURL);
  const prefix = backend.pathname.replace(/\/$/, '');
  const measurements: unknown[] = [];

  async function measure(target: Page, scenario: string, action: () => Promise<void>) {
    const session = await context.newCDPSession(target);
    const requests = new Map<string, { method: string; path: string; key: string; start: number; status?: number; ms?: number }>();
    await session.send('Network.enable');
    session.on('Network.requestWillBeSent', event => {
      const url = new URL(event.request.url);
      if (url.origin !== backend.origin || !url.pathname.startsWith(`${prefix}/`)) return;
      url.searchParams.sort();
      const { method } = event.request;
      requests.set(event.requestId, { method, path: url.pathname.slice(prefix.length), key: `${method} ${url.pathname}${url.search}`, start: event.timestamp });
    });
    session.on('Network.responseReceived', event => {
      const entry = requests.get(event.requestId);
      if (entry) {
        entry.status = event.response.status;
        entry.ms = Math.round((event.timestamp - entry.start) * 1_000);
      }
    });
    try {
      await action();
      // Include late hydration requests in the measured window.
      await target.waitForTimeout(1_000);
    } finally {
      const rows = [...requests.values()];
      const times = rows.flatMap(row => row.ms === undefined ? [] : [row.ms]).sort((a, b) => a - b);
      const percentile = (fraction: number) => times[Math.ceil(fraction * times.length) - 1] ?? null;
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
      measurements.push({
        scenario, requests: rows.length, preflights: rows.filter(row => row.method === 'OPTIONS').length,
        repeatedIdenticalRequests: rows.length - counts.size,
        http429: rows.filter(row => row.status === 429).length,
        http5xx: rows.filter(row => (row.status ?? 0) >= 500).length,
        missingResponse: rows.filter(row => row.status === undefined).length,
        latencyToHeadersMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
        endpoints: [...new Set(rows.map(row => `${row.method} ${row.path}`))],
      });
      await session.detach();
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  try {
    await measure(page, 'Homepage', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('list', { name: 'Books from the catalog' })).toHaveAttribute('aria-busy', 'false');
    });
    await measure(page, 'Home to catalog', async () => {
      await page.getByRole('link', { name: 'View All Books', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Search catalog' })).toHaveAttribute('aria-busy', 'false');
    });
    const book = page.locator('[data-book-card] a').first();
    await expect(book).toBeAttached();
    const href = await book.getAttribute('href');
    const search = page.getByRole('textbox', { name: 'Search catalog' });
    const category = page.getByRole('checkbox').and(page.locator('[id*="-cat-"]')).first();
    if (await category.isVisible()) {
      await measure(page, 'Catalog category filter', async () => {
        await category.click();
        await expect(category).toBeChecked();
        await expect(search).toHaveAttribute('aria-busy', 'false');
      });
    }
    await measure(page, 'Catalog typing', async () => {
      const [finalResponse] = await Promise.all([
        page.waitForResponse(response => {
          const url = new URL(response.url());
          return url.origin === backend.origin && url.searchParams.get('q') === 'validation title';
        }, { timeout: 30_000 }),
        search.pressSequentially('validation title', { delay: 35 }),
      ]);
      expect(finalResponse.ok()).toBe(true);
      await expect(search).toHaveAttribute('aria-busy', 'false');
    });
    await measure(page, 'Book detail', async () => {
      await page.goto(href!, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
    await measure(page, 'Book detail reload', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
    const secondTab = await context.newPage();
    try {
      await measure(secondTab, 'Catalog in second tab', async () => {
        await secondTab.goto('/books', { waitUntil: 'domcontentloaded' });
        await expect(secondTab.getByRole('textbox', { name: 'Search catalog' })).toHaveAttribute('aria-busy', 'false');
      });
    } finally {
      await secondTab.close();
    }
  } finally {
    mkdirSync('test-suite-results', { recursive: true });
    writeFileSync('test-suite-results/public-request-budget.json', JSON.stringify(measurements, null, 2));
  }
});
