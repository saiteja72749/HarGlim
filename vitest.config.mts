import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const unitStorage = path.join(path.dirname(fileURLToPath(import.meta.url)), 'test-suite-results', 'unit-storage');
mkdirSync(path.dirname(unitStorage), { recursive: true });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.dirname(fileURLToPath(import.meta.url)),
    },
  },
  test: {
    // Store tests use the real Node Web Storage API, without a DOM emulator.
    environment: 'node',
    maxWorkers: 1,
    fileParallelism: false,
    execArgv: ['--experimental-webstorage', `--localstorage-file=${unitStorage}`],
    globals: true,
    include: ['app', 'components', 'config', 'context', 'hooks', 'lib', 'store', 'tools']
      .map((directory) => `${directory}/**/*.test.{ts,tsx}`),
    exclude: ['**/node_modules/**', '**/.next/**', '**/.netlify/**', 'tests-e2e/**', 'test-results/**', 'playwright-report/**'],
  },
});
