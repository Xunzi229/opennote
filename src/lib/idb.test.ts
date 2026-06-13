import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idbGetAllPages, idbGetKv, idbWrite } from './idb';
import { getWorkspace, siteRootId, WORKSPACE_KEY, __resetStorageForTests } from './storage';
import type { PageNode, WorkspaceStore } from '../types';

function makePage(id: string, overrides: Partial<PageNode> = {}): PageNode {
  const now = Date.now();
  return {
    id,
    type: 'page',
    site: 'example.com',
    parentId: siteRootId('example.com'),
    title: id,
    content: '',
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeSiteRoot(hostname: string): PageNode {
  const now = Date.now();
  return {
    id: siteRootId(hostname),
    type: 'site',
    site: hostname,
    parentId: null,
    title: hostname,
    content: '',
    sortIndex: 0,
    createdAt: now,
    updatedAt: now,
  };
}

describe('idb wrapper', () => {
  beforeEach(() => {
    __resetStorageForTests();
  });

  it('puts and reads back pages', async () => {
    const page = makePage('p1');
    await idbWrite({ putPages: [page], kv: { rootIds: [] } });

    const pages = await idbGetAllPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe('p1');
  });

  it('deletes pages within the same store', async () => {
    await idbWrite({ putPages: [makePage('p1'), makePage('p2')] });
    await idbWrite({ deletePageIds: ['p1'] });

    const pages = await idbGetAllPages();
    expect(pages.map((p) => p.id)).toEqual(['p2']);
  });

  it('stores and reads typed kv values', async () => {
    await idbWrite({ kv: { rootIds: ['site:example.com'] } });
    await expect(idbGetKv<string[]>('rootIds')).resolves.toEqual(['site:example.com']);
  });

  it('clearAll replaces the whole dataset atomically', async () => {
    await idbWrite({ putPages: [makePage('old')], kv: { rootIds: ['x'] } });
    await idbWrite({ clearAll: true, putPages: [makePage('new')], kv: { rootIds: ['y'] } });

    const pages = await idbGetAllPages();
    expect(pages.map((p) => p.id)).toEqual(['new']);
    await expect(idbGetKv<string[]>('rootIds')).resolves.toEqual(['y']);
  });
});

describe('legacy chrome.storage migration', () => {
  const legacyWorkspace: WorkspaceStore = {
    pages: {
      [siteRootId('example.com')]: makeSiteRoot('example.com'),
      p1: makePage('p1', { title: 'Legacy note' }),
    },
    rootIds: [siteRootId('example.com')],
  };

  let chromeStore: Record<string, unknown>;

  beforeEach(() => {
    __resetStorageForTests();
    chromeStore = { [WORKSPACE_KEY]: legacyWorkspace };

    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn((keys: string, callback?: (result: Record<string, unknown>) => void) => {
            const result = { [keys]: chromeStore[keys] };
            callback?.(result);
            return Promise.resolve(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
            Object.assign(chromeStore, data);
            callback?.();
            return Promise.resolve();
          }),
        },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      runtime: { lastError: null },
    });
  });

  it('migrates legacy workspace into IndexedDB on first read', async () => {
    const workspace = await getWorkspace();

    expect(workspace.pages.p1).toBeDefined();
    expect(workspace.pages.p1.title).toBe('Legacy note');
    expect(workspace.rootIds).toEqual([siteRootId('example.com')]);

    // Data actually landed in IDB.
    const pages = await idbGetAllPages();
    expect(pages.map((p) => p.id).sort()).toEqual([siteRootId('example.com'), 'p1'].sort());
  });

  it('keeps the legacy key intact as a safety net after migration', async () => {
    await getWorkspace();
    expect(chromeStore[WORKSPACE_KEY]).toEqual(legacyWorkspace);
  });

  it('does not re-migrate once IDB holds data', async () => {
    await getWorkspace();
    // Wipe the legacy source; a second read must still return migrated data.
    chromeStore[WORKSPACE_KEY] = undefined;
    __resetStorageForTests();

    const workspace = await getWorkspace();
    expect(workspace.pages.p1).toBeDefined();
  });
});
