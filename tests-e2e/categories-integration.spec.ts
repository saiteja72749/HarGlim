import { test, expect } from './fixtures';
import { backendGet, backendList, backendURL, loginBackend, logoutBackend } from './backend';
import { parseCategoryPage } from '../lib/category-data';

test.use({ trace: 'off' });

test('category directory reflects actual backend names after reload', async ({ page }) => {
  const { categories } = parseCategoryPage(await backendGet('/categories?active=true&limit=100'));
  await page.goto('/categories', { waitUntil: 'domcontentloaded' });
  for (const category of categories) await expect(page.getByRole('heading', { name: category.name, exact: true }).last()).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  if (categories.length) await expect(page.getByRole('heading', { name: categories[0].name, exact: true }).last()).toBeVisible();
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
  await page.getByLabel(category!.name, { exact: true }).first().check();
  const actual = await response;
  expect(actual.ok()).toBe(true);
  for (const book of backendList(await actual.json(), 'books')) expect(book.category?._id).toBe(category!._id);
  await expect(page.getByText(`Category: ${category!.name}`, { exact: true })).toBeVisible();
});

test('real empty category has an honest empty state', async ({ page }) => {
  const { categories } = parseCategoryPage(await backendGet('/categories?active=true&limit=100'));
  const category = categories.find((item) => item.bookCount === 0 && item.slug);
  test.skip(!category, 'The real backend has no empty active category.');
  await page.goto(`/categories/${category!.slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: category!.name, exact: true })).toBeVisible();
  await expect(page.getByText('No books are available in this category yet.', { exact: true })).toBeVisible();
});

test('nonexistent category is not replaced by invented category content', async ({ page }) => {
  await page.goto('/categories/harglim-nonexistent-category-qa-20261120', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /hasn.t been published|category not found/i })).toBeVisible();
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
