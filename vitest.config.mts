import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.dirname(fileURLToPath(import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['app', 'components', 'config', 'context', 'hooks', 'lib', 'store', 'tools']
      .map((directory) => `${directory}/**/*.test.{ts,tsx}`),
    exclude: ['**/node_modules/**', '**/.next/**', '**/.netlify/**', 'tests-e2e/**', 'test-results/**', 'playwright-report/**'],
  },
});
