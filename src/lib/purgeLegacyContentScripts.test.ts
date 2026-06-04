import { beforeEach, describe, expect, it, vi } from 'vitest';
import { purgeLegacyContentScriptsFromOpenTabs, resetLegacyContentScriptPurgeFlag } from './purgeLegacyContentScripts';

const mockSessionStorage: Record<string, unknown> = {};

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const key of Object.keys(mockSessionStorage)) {
    delete mockSessionStorage[key];
  }

  vi.stubGlobal('chrome', {
    scripting: {
      getRegisteredContentScripts: vi.fn((callback: (scripts: chrome.scripting.RegisteredContentScript[]) => void) => {
        callback([{ id: 'opennote-legacy' } as chrome.scripting.RegisteredContentScript]);
      }),
      unregisterContentScripts: vi.fn((_options: { ids: string[] }, callback: () => void) => callback()),
    },
    storage: {
      session: {
        get: vi.fn(async (key: string) => ({ [key]: mockSessionStorage[key] })),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(mockSessionStorage, values);
        }),
        remove: vi.fn(async (key: string) => {
          delete mockSessionStorage[key];
        }),
      },
    },
    tabs: {
      query: vi.fn(async () => [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://docs.example.com' },
      ]),
      reload: vi.fn(async () => undefined),
    },
  });

  await resetLegacyContentScriptPurgeFlag();
});

describe('legacy content script purge', () => {
  it('unregisters old dynamic content scripts without reloading open tabs', async () => {
    await purgeLegacyContentScriptsFromOpenTabs();

    expect(chrome.scripting.unregisterContentScripts).toHaveBeenCalledWith(
      { ids: ['opennote-legacy'] },
      expect.any(Function),
    );
    expect(chrome.tabs.reload).not.toHaveBeenCalled();
  });
});
