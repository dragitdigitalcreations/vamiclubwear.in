import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Stage 51A — minimal vitest config for pure-function unit tests
// (initially: lib/__tests__/retaqo-orders.test.ts). Path alias mirrors
// tsconfig.json so the tests can import via `@/...` like the rest of
// the codebase.
export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
})
