import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(navigator, 'language', {
  value: 'zh-CN',
  configurable: true,
});

Object.defineProperty(navigator, 'languages', {
  value: ['zh-CN'],
  configurable: true,
});

// Global chrome mock for all tests
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((_keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: vi.fn((_data: Record<string, unknown>, callback?: () => void) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
});
