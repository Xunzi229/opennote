import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceStore } from '../types';

// In-memory remote + local stores controlled by the mocks below.
const remote = new Map<string, string>();
let workspace: WorkspaceStore;
let syncStateFiles: Record<string, string>;
let syncStateLastSyncedAt: number | null;

vi.mock('../lib/webdav', () => ({
  uploadFile: vi.fn(async (path: string, content: string) => {
    remote.set(path, content);
  }),
  downloadFile: vi.fn(async (path: string) => remote.get(path) ?? null),
  deleteFile: vi.fn(async (path: string) => {
    remote.delete(path);
  }),
  verifyConnection: vi.fn(async () => undefined),
}));

vi.mock('../lib/syncConfig', async () => {
  const actual = await vi.importActual<typeof import('../lib/syncConfig')>('../lib/syncConfig');
  return {
    ...actual,
    loadWebdavConfig: vi.fn(async () => ({
      url: 'https://dav.example.com',
      username: 'user',
      password: 'secret',
      directory: 'opennote',
      enabled: true,
    })),
    loadSyncState: vi.fn(async () => ({ files: { ...syncStateFiles }, lastSyncedAt: syncStateLastSyncedAt })),
    saveSyncState: vi.fn(async (state: { files: Record<string, string>; lastSyncedAt: number | null }) => {
      syncStateFiles = { ...state.files };
      syncStateLastSyncedAt = state.lastSyncedAt;
    }),
  };
});

vi.mock('../lib/storage', () => ({
  getWorkspace: vi.fn(async () => workspace),
  setWorkspace: vi.fn(async (next: WorkspaceStore) => {
    workspace = next;
  }),
  getMeta: vi.fn(async () => ({ lastActiveSite: null, version: 2 })),
  setMeta: vi.fn(async () => undefined),
}));

import { pullIncremental, pushToWebdav, pullFromWebdav } from './webdavSync';
import { uploadFile, deleteFile } from '../lib/webdav';

function page(id: string, site: string, type: 'site' | 'page' = 'page') {
  return {
    id,
    type,
    site,
    parentId: type === 'site' ? null : `site:${site}`,
    title: id,
    content: '',
    sortIndex: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeWorkspace(): WorkspaceStore {
  return {
    pages: {
      'site:a.com': page('site:a.com', 'a.com', 'site'),
      p1: page('p1', 'a.com'),
      'site:b.com': page('site:b.com', 'b.com', 'site'),
      p2: page('p2', 'b.com'),
    },
    rootIds: ['site:a.com', 'site:b.com'],
  };
}

beforeEach(() => {
  remote.clear();
  workspace = makeWorkspace();
  syncStateFiles = {};
  syncStateLastSyncedAt = null;
  vi.clearAllMocks();
});

describe('webdav sync push/pull', () => {
  it('uploads every file plus the index on first push', async () => {
    const result = await pushToWebdav();

    // config + 2 site files uploaded, plus index.
    expect(result.uploaded.sort()).toEqual(['config', 'sites/a.com', 'sites/b.com']);
    expect(result.skipped).toBe(0);
    expect(remote.has('opennote/index.json')).toBe(true);
    expect(remote.has('opennote/config.json')).toBe(true);
    expect(remote.has('opennote/sites/a.com.json')).toBe(true);
    expect(remote.has('opennote/sites/b.com.json')).toBe(true);
  });

  it('skips unchanged files on the second push (incremental)', async () => {
    await pushToWebdav();
    vi.mocked(uploadFile).mockClear();

    const result = await pushToWebdav();

    // Nothing changed locally: only the index is re-uploaded.
    expect(result.uploaded).toEqual([]);
    expect(result.skipped).toBe(3);
    expect(vi.mocked(uploadFile)).toHaveBeenCalledTimes(1); // index only
  });

  it('uploads only the changed site file after a local edit', async () => {
    await pushToWebdav();
    vi.mocked(uploadFile).mockClear();

    workspace.pages.p1 = { ...workspace.pages.p1, content: 'changed', updatedAt: 2 };
    const result = await pushToWebdav();

    expect(result.uploaded).toEqual(['sites/a.com']);
    // changed site file + index.
    expect(vi.mocked(uploadFile)).toHaveBeenCalledTimes(2);
  });

  it('deletes the remote file when a site is removed locally', async () => {
    await pushToWebdav();
    vi.mocked(deleteFile).mockClear();

    delete workspace.pages['site:b.com'];
    delete workspace.pages.p2;
    workspace.rootIds = ['site:a.com'];

    const result = await pushToWebdav();

    expect(result.deleted).toEqual(['sites/b.com']);
    expect(vi.mocked(deleteFile)).toHaveBeenCalledWith('opennote/sites/b.com.json', expect.anything());
  });

  it('reconstructs the workspace on pull', async () => {
    await pushToWebdav();
    // Wipe local; pull should restore from remote.
    workspace = { pages: {}, rootIds: [] };

    const result = await pullFromWebdav();

    expect(result.applied).toBe(true);
    expect(Object.keys(workspace.pages).sort()).toEqual(['p1', 'p2', 'site:a.com', 'site:b.com']);
    expect(workspace.rootIds.sort()).toEqual(['site:a.com', 'site:b.com']);
  });

  it('throws on pull when no remote backup exists', async () => {
    await expect(pullFromWebdav()).rejects.toThrow();
  });

  // Regression: pullIncremental must MERGE downloaded files into the existing
  // workspace, not replace it. Bug: mergeWorkspaceFromSiteFiles + setWorkspace
  // with only the changed sites would wipe every unchanged site.
  it('pullIncremental preserves unchanged sites (merge, not replace)', async () => {
    // 1. Push both sites.
    await pushToWebdav();

    // 2. Simulate B-device state: workspace only has b.com, sync state only
    //    knows b.com's hash (as if B had never synced a.com).
    workspace = {
      pages: {
        'site:b.com': page('site:b.com', 'b.com', 'site'),
        p2: page('p2', 'b.com'),
      },
      rootIds: ['site:b.com'],
    };
    syncStateFiles = {
      // In B's sync state: no hash for a.com → pullIncremental sees it as "new"
      'sites/b.com': syncStateFiles['sites/b.com'],
    };

    // 3. Pull incremental — should download the missing a.com site file and
    //    MERGE it into B's workspace (which already has b.com).
    const result = await pullIncremental();

    expect(result.downloaded).toContain('sites/a.com');
    // The critical assertion: b.com must survive the pull alongside a.com.
    expect(Object.keys(workspace.pages).sort()).toEqual(['p1', 'p2', 'site:a.com', 'site:b.com']);
    expect(workspace.rootIds.sort()).toEqual(['site:a.com', 'site:b.com']);
  });
});
