import { test, expect } from './fixtures';
import { backendGet, backendList } from './backend';
import { mkdirSync, writeFileSync } from 'node:fs';

const publicRoutes = ['/', '/books', '/search', '/authors', '/about', '/contact', '/publish', '/author-guidelines', '/faq', '/royalty-info', '/returns', '/privacy', '/terms', '/careers', '/spotlight', '/cart', '/login', '/register', '/forgot-password'];

test('public screens fit a narrow mobile viewport and identify their actual route', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 320, height: 812 });
  const metrics: { route: string; width: number; title: string; canonical: string }[] = [];
  for (const path of publicRoutes) {
    await test.step(path, async () => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator('main').count(), `${path}: one main landmark`).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal overflow`).toBe(true);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical!).pathname.replace(/\/$/, '') || '/').toBe(path);
      expect(await page.locator('a button, button a').count(), `${path}: nested controls`).toBe(0);
      metrics.push({ route: path, width: 320, title: await page.title(), canonical: canonical! });
    });
  }
  mkdirSync('test-suite-results', { recursive: true });
  writeFileSync('test-suite-results/public-mobile-screen-results.json', JSON.stringify({ status: 'passed', screens: metrics }, null, 2));
});

test('compact cards fit every width and cart actions remain available on book details', async ({ page }) => {
  const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
  await page.setViewportSize({ width: 390, height: 844 });
  const request = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/api/books'));
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const catalog = await request;
  expect(catalog.ok()).toBe(true);
  const books = backendList(await catalog.json(), 'books');
  const cards = page.locator('[data-book-card]');
  const card = cards.first();
  await expect(card).toBeVisible();
  await expect(card.getByRole('link')).toHaveCount(1);
  await expect(card.getByRole('button')).toHaveCount(0);
  await expect(card.locator('h3')).toContainText(books[0].title);
  await expect(card.locator('.line-clamp-2')).toHaveCSS('-webkit-line-clamp', '2');
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Catalog at ${width}px`).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const rect = (await card.boundingBox())!;
  const cover = (await card.locator('.book-card-cover').boundingBox())!;
  expect(rect.height).toBeLessThan(350);
  expect(cover.width / cover.height).toBeCloseTo(2 / 3, 1);
  writeFileSync('test-suite-results/mobile-catalog-after.json', JSON.stringify({ width: rect.width, height: rect.height, coverHeight: cover.height, viewport: 390 }, null, 2));
  await page.screenshot({ path: 'test-suite-results/mobile-catalog-after.png' });
  const available = books.find((book) => book.slug && typeof book.price === 'number' && (book.stock || 0) > (book.reservedStock || 0));
  test.skip(!available, 'The first backend page has no priced book in stock for a local cart check.');
  await cards.getByRole('link', { name: available.title, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(available.title);
  await expect(page.getByRole('button', { name: 'Save to wishlist' })).toBeVisible();
  await expect(page.getByText(/customer reviews|rating unavailable|no ratings yet/i)).toHaveCount(0);
  const button = page.getByRole('button', { name: 'Add to Cart', exact: true }).first();
  await expect(button).toBeEnabled();
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await button.click();
  await page.goto('/cart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(available.title, { exact: true }).first()).toBeVisible();
});

test('empty backend categories remain real navigable collections', async ({ page }) => {
  const categories = backendList(await backendGet('/categories?active=true&limit=100'), 'categories');
  const empty = categories.find((item) => item.bookCount === 0 && item.slug);
  test.skip(!empty, 'No real empty category is available.');
  await page.goto(`/categories/${encodeURIComponent(empty.slug)}`, { waitUntil: 'domcontentloaded' });
  expect(new URL(page.url()).searchParams.get('category')).toBe(empty.slug);
  await expect(page.getByRole('heading', { name: /no books found/i })).toBeVisible();
});

test('book content is present in server HTML with real metadata', async ({ request }) => {
  const books = backendList(await backendGet('/books?limit=1'), 'books');
  test.skip(!books[0]?.slug, 'No real public book is available.');
  const response = await request.get(`/books/${encodeURIComponent(books[0].slug)}`);
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toMatch(/<h1\b[^>]*>/);
  const structuredData = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, body]) => JSON.parse(body));
  expect(structuredData).toContainEqual(expect.objectContaining({ '@type': 'Book', name: books[0].title }));
});

test('a live book detail page fits all requested viewports', async ({ page }) => {
  const books = backendList(await backendGet('/books?limit=1'), 'books');
  test.skip(!books[0]?.slug, 'No real public book is available.');
  await page.goto(`/books/${encodeURIComponent(books[0].slug)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(books[0].title);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Book details at ${width}px`).toBeLessThanOrEqual(width);
  }
});

test('the homepage carousel advances and keeps arrows and swipe available', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const response = page.waitForResponse((item) => {
    const url = new URL(item.url());
    return url.pathname.endsWith('/api/books') && url.searchParams.get('limit') === '10' && url.searchParams.get('page') === '1';
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const result = await response;
  expect(result.ok()).toBe(true);
  const books = backendList(await result.json(), 'books');
  test.skip(!books.length, 'No published books returned by the real API.');
  const shelf = page.getByRole('list', { name: 'Books from the catalog' });
  await expect(page.getByText('Reader Favorites', { exact: true })).toHaveCount(0);
  const links = shelf.locator('[data-book-card] a');
  await expect(links.first()).toBeVisible();
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.length).toBeLessThanOrEqual(10);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `Home at ${width}px`).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const next = page.getByRole('button', { name: 'Next books', exact: true });
  if (await shelf.evaluate((node) => node.scrollWidth > node.clientWidth)) {
    await shelf.scrollIntoViewIfNeeded();
    const visibleSlides = await shelf.evaluate((node) => {
      const viewport = node.getBoundingClientRect();
      return [...node.children].filter((slide) => {
        const box = slide.getBoundingClientRect();
        return box.left >= viewport.left - 1 && box.right <= viewport.right + 1;
      }).length;
    });
    expect(visibleSlides).toBe(3);
    const previous = page.getByRole('button', { name: 'Previous books', exact: true });
    const shelfBox = (await shelf.boundingBox())!;
    expect((await previous.boundingBox())!.x).toBeLessThan(shelfBox.x);
    expect((await next.boundingBox())!.x).toBeGreaterThan(shelfBox.x + shelfBox.width);
    await page.mouse.move(0, 0);
    await expect.poll(() => shelf.evaluate((node) => node.scrollLeft), { timeout: 10_000 }).toBeGreaterThan(4);
    await page.getByRole('button', { name: 'Pause book carousel' }).click();
    await expect(page.getByRole('button', { name: 'Resume book carousel' })).toBeVisible();
    await shelf.evaluate((node) => { node.scrollLeft = 0; });
    await next.click();
    await expect.poll(() => shelf.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    await previous.click();
    await expect.poll(() => shelf.evaluate((node) => node.scrollLeft)).toBeLessThan(2);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await shelf.scrollIntoViewIfNeeded();
  if (await shelf.evaluate((node) => node.scrollWidth > node.clientWidth)) {
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const box = (await shelf.boundingBox())!;
    const y = Math.floor(box.y + box.height / 2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y }] });
    for (const x of [270, 220, 165, 110, 65]) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => shelf.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    await session.detach();
  }
  const publishBanner = page.getByRole('region', { name: /publish/i });
  await expect(publishBanner.getByRole('heading')).toHaveText(/\S/);
  await expect(publishBanner.getByRole('link')).toHaveText(/\S/);
  await expect(publishBanner.getByRole('link')).toHaveAttribute('href', '/publish');
});

test('reduced motion keeps route content visible without a long transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const styles = await page.locator('.route-transition').evaluate((element) => ({ duration: getComputedStyle(element).animationDuration, transform: getComputedStyle(element).transform }));
  expect(parseFloat(styles.duration)).toBeLessThan(0.01);
  expect(styles.transform).toBe('none');
});

test('clearing search returns to an idle input without showing stale results', async ({ page }) => {
  await page.goto('/search?q=book', { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('searchbox', { name: 'Search books' });
  await input.fill('');
  await expect(input).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByText('Start typing to search our catalog, or browse all books.')).toBeVisible();
});

test('catalog deep links initialize the actual query and bestseller filter', async ({ page }) => {
  await page.goto('/books?q=ui-audit-no-match-20261122', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'Search catalog' })).toHaveValue('ui-audit-no-match-20261122');
  await expect(page.getByText('No books found matching your criteria')).toBeVisible();
  const response = page.waitForResponse((item) => {
    const url = new URL(item.url());
    return url.pathname.endsWith('/api/books') && url.searchParams.get('bestseller') === 'true';
  });
  await page.getByRole('link', { name: 'Bestsellers', exact: true }).click();
  await expect(page).toHaveURL(/\/books\?tag=bestseller$/);
  const result = await response;
  expect(result.ok()).toBe(true);
  const bestsellers = backendList(await result.json(), 'books');
  expect(bestsellers.every((book) => book.isBestseller === true || book.bestseller === true)).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Search catalog' })).toHaveAttribute('aria-busy', 'false');
  await page.goto('/books?minRating=4&sort=rating&q=ui-audit-no-match-20261122', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('No books found matching your criteria')).toBeVisible();
  await expect(page.getByText(/Top Rated|Minimum rating/i)).toHaveCount(0);
});
