import { test, expect } from './fixtures';

// Password entry and real session state must never be captured in trace artifacts.
test.use({ trace: 'off' });

test('real author signs in through the website and signs out across tabs', async ({ page, context }) => {
  test.setTimeout(120_000);
  const email = process.env.E2E_AUTHOR_EMAIL;
  const password = process.env.E2E_AUTHOR_PASSWORD;
  if (!email || !password) throw new Error('Configure the real author test account in .env.test.local.');
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: 'Sign In with Password', exact: true }).click();
  await expect(page).toHaveURL(/\/author$/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Author Workspace', exact: true })).toBeVisible();
  const secondTab = await context.newPage();
  await secondTab.goto('/author', { waitUntil: 'domcontentloaded' });
  await expect(secondTab.getByRole('heading', { name: 'Author Workspace', exact: true })).toBeVisible();
  const logout = page.waitForResponse((response) => response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  expect((await logout).ok()).toBe(true);
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.isAuthenticated)).toBe(false);
  await expect(secondTab).toHaveURL(/\/login\?redirect=%2Fauthor$/);
  await secondTab.close();
});
