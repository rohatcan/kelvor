import { beforeEach, afterEach, vi, expect } from 'vitest';

// Global test setup
beforeEach(() => {
  // Clear DOM between tests
  document.body.innerHTML = '';

  // Mock console methods in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn();

  // Mock performance.now
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
    },
    writable: true,
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Set up global test flags
  (global as any).__TEST__ = true;
  (global as any).__DEV__ = true;
});

afterEach(() => {
  // Restore all mocks
  vi.restoreAllMocks();

  // Clear any timers
  vi.clearAllTimers();
});

// Custom matchers for game testing
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Extend TypeScript matchers
declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeWithinRange(floor: number, ceiling: number): T;
    }
  }
}