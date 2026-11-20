import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env.test.local']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const production = process.env.PLAYWRIGHT_SERVER_MODE === 'production';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/**
 * E2E smoke tests. These run against a real dev server which talks to the
 * live backend — kept strictly read-only navigation (no checkout/payment
 * submission) so the suite is safe to run against production data.
 */
export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  workers: 1,
  // Dev-mode Turbopack compiles each route on first request; on a slow
  // filesystem that first compile alone can exceed the default 30s.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 45_000,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } } : {}),
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: production ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !production && !process.env.CI,
    timeout: 300_000,
  },
});
