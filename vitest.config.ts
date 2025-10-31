import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Global test environment setup
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],

    // Test file patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '**/*.d.ts',
      '**/*.config.ts',
      '**/test/**' // Exclude test utilities from actual test runs
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/test/**',
        'src/main.ts',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      },
      clean: true,
      cleanOnRerun: true
    },

    // Test runner configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    passWithNoTests: false,
    allowOnly: !process.env.CI,
    watch: !process.env.CI,

    // Reporter configuration
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './coverage/test-report.html'
    },

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    // Benchmark configuration
    benchmark: {
      include: ['src/**/*.{bench,benchmark}.{ts,tsx}'],
      exclude: ['node_modules', 'dist']
    }
  },

  // Resolve configuration for path aliases (matching vite.config.ts)
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/scenes': resolve(__dirname, 'src/scenes'),
      '@/systems': resolve(__dirname, 'src/systems'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/config': resolve(__dirname, 'src/config'),
      '@/test': resolve(__dirname, 'src/test')
    }
  },

  // Define global variables for tests
  define: {
    __TEST__: true,
    __DEV__: true
  }
})