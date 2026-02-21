import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        'vitest.config.ts',
        '**/*.test.ts',
        '**/__tests__/**',
      ],
    },
  },
})
