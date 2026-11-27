import { test, expect } from './fixtures';
import { backendData, backendGet, backendList, loginBackend, logoutBackend } from './backend';

test.use({ trace: 'off' });

test('all public collections are served by the actual backend', async () => {
  for (const [path, key] of [['/books?limit=2', 'books'], ['/authors?limit=2', 'authors'], ['/categories?limit=100', 'categories'], ['/publish-packages', 'packages'], ['/spotlights?limit=2', 'spotlights']]) {
    const list = backendList(await backendGet(path), key);
    expect(Array.isArray(list)).toBe(true);
    for (const record of list) expect(String(record._id || record.id)).toMatch(/^[a-f\d]{24}$/i);
  }
});

test('public home content matches backend copy', async ({ page }) => {
  const content = backendData(await backendGet('/content'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(content.homeTitle ?? content.hero.title);
  await expect(page).toHaveTitle(content.seo?.title || 'Harglim Publishers');
  const subtitle = content.homeSubtitle ?? content.hero.subtitle;
  if (subtitle) await expect(page.getByText(subtitle, { exact: true }).first()).toBeVisible();
});

test('the public author profile displays the saved name and biography', async ({ page }) => {
  const records = backendList(await backendGet('/authors?limit=10'), 'authors');
  const candidate = records.find(author => author.bio?.trim()) ?? records[0];
  test.skip(!candidate, 'The real backend returned no public authors.');
  const id = encodeURIComponent(candidate._id || candidate.id);
  const profile = backendData(await backendGet(`/authors/${id}`));
  await page.goto(`/authors/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.name);
  await page.getByRole('button', { name: 'Biography & Story' }).click();
  await expect(page.getByRole('heading', { name: `About ${profile.name}` })).toBeVisible();
  const biography: string = typeof profile.bio === 'string' ? profile.bio.trim() : '';
  for (const paragraph of biography ? biography.split('\n\n').filter(text => text.trim()) : ['No biography has been published.']) {
    await expect(page.getByText(paragraph, { exact: true }).last()).toBeVisible();
  }
});

test('directory and public author detail display a backend photo after reload', async ({ page }) => {
  const authors = backendList(await backendGet('/authors?page=1&limit=100'), 'authors');
  const author = authors.find(record => /^https?:\/\//.test(record.profilePicture || ""));
  test.skip(!author, 'No real author with an uploaded photo is available.');
  const path = `/authors/${encodeURIComponent(author._id || author.id)}`;
  await page.goto('/authors', { waitUntil: 'domcontentloaded' });
  const card = page.locator(`a[href="${path}"]`);
  await expect(card.locator('img')).toHaveAttribute('src', /.+/);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  for (let pass = 0; pass < 2; pass++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(author.name);
    const image = page.locator('main img').first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const src = new URL((await image.getAttribute('src'))!, page.url());
    expect(src.searchParams.get('url') ?? src.href).toBe(new URL(author.profilePicture).href);
    if (pass === 0) await page.reload({ waitUntil: 'domcontentloaded' });
  }
});

test('Saiyara specifications reflect the live language field after reload', async ({ page }) => {
  const book = backendData(await backendGet('/books/saiyara'));
  await page.goto('/books/saiyara', { waitUntil: 'domcontentloaded' });
  for (let pass = 0; pass < 2; pass++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(book.title);
    const language = page.getByText('Language', { exact: true }).first();
    await expect(language.locator('..')).toContainText(book.language?.trim() || 'Not provided');
    if (pass === 0) await page.reload({ waitUntil: 'domcontentloaded' });
  }
});

test('the FAQ page shows only the backend-published FAQ list', async ({ page }) => {
  const content = backendData(await backendGet('/content'));
  const faqs = Array.isArray(content.faq) ? content.faq : typeof content.faqsJson === 'string' ? JSON.parse(content.faqsJson) : [];
  await page.goto('/faq', { waitUntil: 'domcontentloaded' });
  if (faqs.length === 0) await expect(page.getByText('No FAQs have been published yet.')).toBeVisible();
  else for (const group of faqs) for (const item of group.items ?? [group]) await expect(page.getByRole('button', { name: item.question, exact: true })).toBeVisible();
});

test('search links send their query string to the real backend', async ({ page }) => {
  const response = page.waitForResponse((res) => {
    const url = new URL(res.url());
    return url.pathname.endsWith('/api/search') && url.searchParams.get('q') === 'book';
  });
  await page.goto('/search?q=book', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('searchbox')).toHaveValue('book');
  expect((await response).ok()).toBe(true);
});

test('unpublished backend policy sections do not become frontend policy claims', async ({ page }) => {
  const content = backendData(await backendGet('/content'));
  const raw = content.privacySectionsJson ?? content.siteSettings?.siteContent?.privacySectionsJson ?? '[]';
  const sections = JSON.parse(raw);
  await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();
  if (sections.length === 0) await expect(page.getByText('Detailed information has not been published yet.')).toBeVisible();
  else for (const section of sections) await expect(page.getByRole('heading', { name: section.title, exact: true })).toBeVisible();
});

test.describe('Real admin integration', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, 'A real admin test account is required; author privileges cannot verify admin endpoints.');
  test('admin collections require and accept a real admin session', async () => {
    const admin = await loginBackend('ADMIN');
    try {
      for (const path of ['/admin/books?limit=1', '/admin/users?limit=1', '/admin/orders?limit=1']) await backendGet(path, admin);
    } finally { await logoutBackend(admin); }
  });
});
