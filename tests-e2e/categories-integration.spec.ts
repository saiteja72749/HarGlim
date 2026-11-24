import { test, expect } from './fixtures';
import { backendGet, backendList, backendURL, loginBackend, logoutBackend } from './backend';
import { parseCategoryPage } from '../lib/category-data';

test.use({ trace: 'off' });

test('legacy category directory redirects and the catalog reflects real categories after reload', async ({ page }) => {
  const { categories } = parseCategoryPage(await backendGet('/categories?active=true&limit=100'));
  await page.goto('/categories', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/books$/);
  for (const category of categories) await expect(page.getByLabel(category.name, { exact: true }).first()).toBeAttached();
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (categories.length) await expect(page.getByLabel(categories[0].name, { exact: true }).first()).toBeAttached();
});

test('catalog sends the selected backend category slug and shows matching relationships', async ({ page }) => {
  const { categories } = parseCategoryPage(await backendGet('/categories?active=true&limit=100'));
  const category = categories.find((item) => item.bookCount && item.slug);
  test.skip(!category, 'The real backend has no populated active category.');
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const response = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname.endsWith('/api/books') && url.searchParams.get('category') === category!.slug;
  });
  const checkbox = page.getByRole('checkbox', { name: category!.name, exact: true });
  // The Radix checkbox reflects the router's committed query state after the click.
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  const actual = await response;
  expect(actual.ok()).toBe(true);
  for (const book of backendList(await actual.json(), 'books')) expect(book.category?._id).toBe(category!._id);
  await expect(page.getByText(`Category: ${category!.name}`, { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("category")).toBe(category!.slug);
});

test('real empty category has an honest empty state', async ({ page }) => {
  const { categories } = parseCategoryPage(await backendGet('/categories?active=true&limit=100'));
  const category = categories.find((item) => item.bookCount === 0 && item.slug);
  test.skip(!category, 'The real backend has no empty active category.');
  await page.goto(`/categories/${category!.slug}`, { waitUntil: 'domcontentloaded' });
  expect(new URL(page.url()).searchParams.get('category')).toBe(category!.slug);
  await expect(page.getByText(`Category: ${category!.name}`, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /no books found/i })).toBeVisible();
});

test('catalog combines filter parameters in a single server-paginated request', async ({ page }) => {
  const all = backendList(await backendGet('/books?limit=100'), 'books');
  const eligible = all.find((book) => book.category?.slug && book.format && typeof book.price === 'number');
  test.skip(!eligible, 'A live title with category, format and price is required.');
  const params = new URLSearchParams({
    category: eligible.category.slug, format: eligible.format, minPrice: String(eligible.price), sort: 'price-low',
  });
  const response = page.waitForResponse((item) => {
    const url = new URL(item.url());
    return url.pathname.endsWith('/api/books') &&
      url.searchParams.get('category') === eligible.category.slug &&
      url.searchParams.get('format') === eligible.format &&
      url.searchParams.get('minPrice') === String(eligible.price) &&
      url.searchParams.get('sort') === 'price_asc' && url.searchParams.get('limit') === '12';
  });
  await page.goto(`/books?${params}`, { waitUntil: 'domcontentloaded' });
  const result = await response;
  expect(result.ok()).toBe(true);
  const items = backendList(await result.json(), 'books');
  expect(items.length).toBeGreaterThan(0);
  for (const book of items) {
    expect(book.category?.slug).toBe(eligible.category.slug);
    expect(book.format).toBe(eligible.format);
    expect(book.price).toBeGreaterThanOrEqual(eligible.price);
  }
  await expect(page.locator('[data-book-card]')).toHaveCount(items.length);
});

test('catalog page two renders the next backend page without repeating titles', async ({ page }) => {
  const catalogPage = (pageNumber: string) => page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith('/api/books') && url.searchParams.get('page') === pageNumber;
  });
  const firstPage = catalogPage('1');
  await page.goto('/books', { waitUntil: 'domcontentloaded' });
  const firstResponse = await firstPage;
  expect(firstResponse.ok()).toBe(true);
  const firstPayload = await firstResponse.json();
  const first = backendList(firstPayload, 'books');
  await expect(page.locator('[data-book-card]')).toHaveCount(first.length);
  const next = page.getByRole('button', { name: 'Next', exact: true });
  const pages = firstPayload.pagination?.pages ?? firstPayload.data?.pagination?.pages;
  test.skip(pages === 1, 'The live catalog has one page.');
  await expect(next).toBeEnabled();
  const secondPage = catalogPage('2');
  await next.click();
  const secondResponse = await secondPage;
  expect(secondResponse.ok()).toBe(true);
  const second = backendList(await secondResponse.json(), 'books');
  const seen = new Set(first.map((book) => book._id));
  expect(second.length).toBeGreaterThan(0);
  expect(second.every((book) => !seen.has(book._id))).toBe(true);
  await expect(page.locator('[data-book-card]')).toHaveCount(second.length);
});

test('nonexistent category is not replaced by invented category content', async ({ page }) => {
  await page.goto('/categories/harglim-nonexistent-category-qa-20261120', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /category not found/i })).toBeVisible();
  await page.getByRole('button', { name: 'Remove category filter' }).click();
  expect(new URL(page.url()).searchParams.get('category')).toBeNull();
});

test('category admin reads reject anonymous and real author sessions', async () => {
  const anonymous = await fetch(`${backendURL}/admin/categories?limit=1`);
  expect(anonymous.status).toBe(401);
  test.skip(!process.env.E2E_AUTHOR_EMAIL || !process.env.E2E_AUTHOR_PASSWORD, 'A real author account is required.');
  const author = await loginBackend('AUTHOR');
  try {
    const response = await fetch(`${backendURL}/admin/categories?limit=1`, { headers: { Authorization: `Bearer ${author.token}` } });
    expect(response.status).toBe(403);
  } finally { await logoutBackend(author); }
});

test('real admin can retrieve both active and inactive category inventories', async () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'Authorized admin credentials are unavailable; CRUD cannot be claimed verified.');
  const admin = await loginBackend('ADMIN');
  try {
    for (const active of [true, false]) parseCategoryPage(await backendGet(`/admin/categories?active=${active}&limit=100`, admin));
  } finally { await logoutBackend(admin); }
});
