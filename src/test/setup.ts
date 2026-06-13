import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { __resetIdbForTests } from '../lib/idb';
import { __resetStorageForTests } from '../lib/storage';

// Give every test a real (in-memory) IndexedDB and a clean slate. A fresh
// IDBFactory drops all databases; resetting the wrappers clears cached
// connections and the one-time migration guard.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  __resetIdbForTests();
  __resetStorageForTests();
});

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
