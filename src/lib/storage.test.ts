import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPage,
  createEmptyWorkspace,
  deletePage,
  exportWorkspaceBackup,
  exportWorkspaceMarkdown,
  getMeta,
  getWorkspace,
  getWorkspaceStorageUsage,
  importWorkspaceBackup,
  movePage,
  onWorkspaceChange,
  setWorkspace,
  setMeta,
  siteRootId,
  updatePageContent,
  updatePageTitle,
  WORKSPACE_KEY,
} from './storage';

const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  mockStorage[WORKSPACE_KEY] = undefined;
  vi.clearAllMocks();
});

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `page-${Math.random().toString(16).slice(2)}`),
});

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
        let result: Record<string, unknown> = {};
        if (typeof keys === 'string') {
          result = { [keys]: mockStorage[keys] };
        } else if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = mockStorage[key];
          });
        } else {
          result = mockStorage;
        }
        callback?.(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
        return Promise.resolve();
      }),
      getBytesInUse: vi.fn((_keys: string | string[] | null, callback?: (bytes: number) => void) => {
        callback?.(2048);
        return Promise.resolve(2048);
      }),
      QUOTA_BYTES: 10485760,
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

describe('workspace storage utilities', () => {
  it('returns an empty workspace when none exists', async () => {
    await expect(getWorkspace()).resolves.toEqual(createEmptyWorkspace());
  });

  it('persists workspace data', async () => {
    const workspace = { pages: {}, rootIds: [] };
    await setWorkspace(workspace);
    await expect(getWorkspace()).resolves.toEqual(workspace);
  });

  it('creates a fixed site root and child page', async () => {
    const page = await addPage('example.com', null, 'hello', 'Example page');
    const workspace = await getWorkspace();
    const root = workspace.pages[siteRootId('example.com')];

    expect(root.type).toBe('site');
    expect(root.parentId).toBeNull();
    expect(page.parentId).toBe(root.id);
    expect(workspace.pages[page.id].content).toBe('hello');
  });

  it('serializes concurrent page additions without losing pages', async () => {
    const [first, second] = await Promise.all([
      addPage('example.com', null, 'first', 'First'),
      addPage('example.com', null, 'second', 'Second'),
    ]);

    const workspace = await getWorkspace();
    expect(Object.keys(workspace.pages)).toEqual(
      expect.arrayContaining([siteRootId('example.com'), first.id, second.id]),
    );
  });

  it('updates page content and title', async () => {
    const page = await addPage('example.com', null, 'old', 'Old');

    await updatePageContent(page.id, 'new');
    await updatePageTitle(page.id, 'New title');

    const workspace = await getWorkspace();
    expect(workspace.pages[page.id].content).toBe('new');
    expect(workspace.pages[page.id].title).toBe('New title');
  });

  it('deletes a page subtree', async () => {
    const parent = await addPage('example.com', null, 'parent', 'Parent');
    const child = await addPage('example.com', parent.id, 'child', 'Child');

    await deletePage(parent.id);

    const workspace = await getWorkspace();
    expect(workspace.pages[parent.id]).toBeUndefined();
    expect(workspace.pages[child.id]).toBeUndefined();
    expect(workspace.pages[siteRootId('example.com')]).toBeDefined();
  });

  it('moves a page under another parent and updates subtree site', async () => {
    const firstRootPage = await addPage('example.com', null, 'parent', 'Parent');
    const child = await addPage('example.com', firstRootPage.id, 'child', 'Child');
    const otherRoot = await addPage('other.com', null, 'other', 'Other');

    await movePage(firstRootPage.id, otherRoot.id);

    const workspace = await getWorkspace();
    expect(workspace.pages[firstRootPage.id].parentId).toBe(otherRoot.id);
    expect(workspace.pages[firstRootPage.id].site).toBe('other.com');
    expect(workspace.pages[child.id].site).toBe('other.com');
  });

  it('exports and imports workspace backup JSON', async () => {
    const page = await addPage('example.com', 'missing', 'hello', 'Test page');
    const backup = await exportWorkspaceBackup(123);

    await setWorkspace(createEmptyWorkspace());
    await importWorkspaceBackup(backup);

    const workspace = await getWorkspace();
    expect(workspace.pages[page.id]).toEqual(page);
  });

  it('exports workspace as markdown', async () => {
    await addPage('example.com', null, 'hello markdown', 'Markdown page');
    const markdown = await exportWorkspaceMarkdown(123);

    expect(markdown).toContain('# WebNest Export');
    expect(markdown).toContain('## example.com');
    expect(markdown).toContain('### Markdown page');
    expect(markdown).toContain('hello markdown');
  });

  it('returns local workspace storage usage', async () => {
    await expect(getWorkspaceStorageUsage()).resolves.toEqual({
      bytesInUse: 2048,
      quotaBytes: 10485760,
    });
  });

  it('does not crash when workspace change events are unavailable', () => {
    const storage = chrome.storage as unknown as {
      onChanged?: typeof chrome.storage.onChanged;
    };
    const originalOnChanged = storage.onChanged;
    storage.onChanged = undefined;

    const unsubscribe = onWorkspaceChange(vi.fn());

    expect(() => unsubscribe()).not.toThrow();
    storage.onChanged = originalOnChanged;
  });

  it('uses memory storage when chrome local storage is unavailable', async () => {
    const storage = chrome.storage as unknown as {
      local?: typeof chrome.storage.local;
    };
    const originalLocal = storage.local;
    storage.local = undefined;
    const workspace = {
      pages: {},
      rootIds: [],
    };

    await setWorkspace(workspace);
    await setMeta({ lastActiveSite: null, version: 2, showSidebar: false });

    await expect(getWorkspace()).resolves.toEqual(workspace);
    await expect(getMeta()).resolves.toMatchObject({ showSidebar: false });
    storage.local = originalLocal;
  });
});
