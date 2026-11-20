import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use) => {
    // The shared live API permits 100 requests per window. Each page makes
    // several requests; pace tests instead of overwhelming the real service.
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const errors: string[] = [];
    const onError = (error: Error) => errors.push(error.message);
    page.on('pageerror', onError);
    await use();
    page.off('pageerror', onError);
    expect(errors, 'The page must not throw uncaught JavaScript errors').toEqual([]);
  }, { auto: true }],
});

export { expect };
export type { Page } from '@playwright/test';
