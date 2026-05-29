import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global chrome mock for all tests
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((_keys: any, callback?: any) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: vi.fn((_data: any, callback?: any) => {
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