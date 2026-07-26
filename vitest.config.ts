import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    // Unit tests mock the DB driver; keep them isolated from the e2e Playwright suite.
    // `.smoke.test.ts` files exercise sink/integration wiring without a real DB.
    include: ['src/**/*.unit.test.ts', 'src/**/*.smoke.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      'server-only': path.resolve(rootDir, 'src/auth/lib/empty-mock.ts'),
    },
  },
});
