import { getMeta, getWorkspace, setMeta, setWorkspace } from '../lib/storage';
import { getCurrentLocale, setLocale } from '../i18n';
import {
  downloadFile,
  deleteFile,
  uploadFile,
  verifyConnection,
  type WebdavConnection,
} from '../lib/webdav';
import {
  isWebdavConfigured,
  loadSyncState,
  loadWebdavConfig,
  saveSyncState,
  type WebdavConfig,
} from '../lib/syncConfig';
import {
  CONFIG_FILE_KEY,
  buildConfigPayload,
  buildSiteFiles,
  hashString,
  indexRemotePath,
  mergeWorkspaceFromSiteFiles,
  parseConfigPayload,
  parseSiteFile,
  remotePathForKey,
  serializeStable,
  type SiteFilePayload,
  type SyncIndex,
} from '../lib/syncPayload';

export interface PushResult {
  uploaded: string[];
  deleted: string[];
  skipped: number;
}

export interface PullResult {
  downloaded: string[];
  applied: boolean;
}

function toConnection(config: WebdavConfig): WebdavConnection {
  return { url: config.url.trim(), username: config.username.trim(), password: config.password };
}

export async function verifyWebdav(config?: WebdavConfig): Promise<void> {
  const resolved = config ?? (await loadWebdavConfig());
  if (!isWebdavConfigured(resolved)) {
    throw new Error('请先填写完整的 WebDAV 地址、用户名和密码。');
  }
  await verifyConnection(toConnection(resolved), indexRemotePath(resolved.directory));
}

// Build the full set of logical files (key -> serialized JSON) from local state.
async function buildLocalFiles(): Promise<Map<string, string>> {
  const [workspace, meta] = await Promise.all([getWorkspace(), getMeta()]);
  const files = new Map<string, string>();

  const siteFiles = buildSiteFiles(workspace);
  for (const [key, payload] of siteFiles) {
    files.set(key, serializeStable(payload));
  }

  files.set(CONFIG_FILE_KEY, serializeStable(buildConfigPayload(meta, getCurrentLocale())));
  return files;
}

export async function pushToWebdav(config?: WebdavConfig): Promise<PushResult> {
  const resolved = config ?? (await loadWebdavConfig());
  if (!isWebdavConfigured(resolved)) {
    throw new Error('请先配置 WebDAV 后再同步。');
  }

  const conn = toConnection(resolved);
  const localFiles = await buildLocalFiles();
  const syncState = await loadSyncState();

  const uploaded: string[] = [];
  let skipped = 0;
  const now = Date.now();
  const nextIndex: SyncIndex = { version: 1, updatedAt: now, files: {} };
  const nextStateFiles: Record<string, import('../lib/syncConfig').FileSyncEntry> = {};

  // Upload changed/new files.
  for (const [key, content] of localFiles) {
    const hash = hashString(content);
    const existing = syncState.files[key];
    const version = (existing?.hash === hash ? existing.version : (existing?.version ?? 0) + 1);
    nextIndex.files[key] = { hash, updatedAt: now, version };
    nextStateFiles[key] = { hash, version, lastSyncTime: now };

    if (existing?.hash === hash) {
      nextStateFiles[key] = existing;
      skipped += 1;
      continue;
    }

    await uploadFile(remotePathForKey(resolved.directory, key), content, conn);
    uploaded.push(key);
  }

  // Delete remote files that no longer exist locally (e.g. removed sites).
  const deleted: string[] = [];
  for (const key of Object.keys(syncState.files)) {
    if (localFiles.has(key)) continue;
    await deleteFile(remotePathForKey(resolved.directory, key), conn);
    deleted.push(key);
  }

  // Upload the index last so it reflects a copleted push.
  await uploadFile(indexRemotePath(resolved.directory), serializeStable(nextIndex), conn);
  await saveSyncState({ files: nextStateFiles, lastSyncedAt: now });

  return { uploaded, deleted, skipped };
}

export async function pullFromWebdav(config?: WebdavConfig): Promise<PullResult> {
  const resolved = config ?? (await loadWebdavConfig());
  if (!isWebdavConfigured(resolved)) {
    throw new Error('请先配置 WebDAV 后再同步。');
  }

  const conn = toConnection(resolved);
  const indexJson = await downloadFile(indexRemotePath(resolved.directory), conn);
  if (!indexJson) {
    throw new Error('云端没有可拉取的备份，请先上传。');
  }

  const index = JSON.parse(indexJson) as SyncIndex;
  const keys = Object.keys(index.files ?? {});
  const downloaded: string[] = [];
  const siteFiles: SiteFilePayload[] = [];
  let configJson: string | null = null;

  for (const key of keys) {
    const content = await downloadFile(remotePathForKey(resolved.directory, key), conn);
    if (content === null) continue;
    downloaded.push(key);

    if (key === CONFIG_FILE_KEY) {
      configJson = content;
    } else {
      const parsed = parseSiteFile(content);
      if (parsed) siteFiles.push(parsed);
    }
  }

  // Reconstruct and apply the workspace (last-write-wins: remote replaces local).
  const workspace = mergeWorkspaceFromSiteFiles(siteFiles);
  await setWorkspace(workspace);

  // Apply config (meta + locale).
  if (configJson) {
    const config = parseConfigPayload(configJson);
    if (config) {
      await setMeta(config.meta);
      if (config.locale) setLocale(config.locale);
    }
  }

  // Align sync state with what we just pulled so the next auto-push is a no-op
  // (no flag needed to suppress the upload that the workspace change triggers).
  const now = Date.now();
  const nextStateFiles: Record<string, import('../lib/syncConfig').FileSyncEntry> = {};
  for (const [key, entry] of Object.entries(index.files ?? {})) {
    nextStateFiles[key] = {
      hash: entry.hash,
      version: entry.version ?? 0,
      lastSyncTime: now,
    };
  }
  await saveSyncState({ files: nextStateFiles, lastSyncedAt: now });

  return { downloaded, applied: true };
}

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// Lightweight pull that only downloads files whose hash differs from local
// sync state, OR whose last successful sync was more than STALE_THRESHOLD_MS ago.
// When nothing changed this is a single GET for index.json.
// If no remote backup exists yet, this is a no-op (used by pull-before-edit).
export async function pullIncremental(config?: WebdavConfig): Promise<PullResult> {
  const resolved = config ?? (await loadWebdavConfig());
  if (!isWebdavConfigured(resolved)) return { downloaded: [], applied: false };

  const conn = toConnection(resolved);
  const syncState = await loadSyncState();
  const indexJson = await downloadFile(indexRemotePath(resolved.directory), conn);
  if (!indexJson) return { downloaded: [], applied: false }; // no remote yet

  const index = JSON.parse(indexJson) as SyncIndex;
  const now = Date.now();
  const changedKeys: string[] = [];

  for (const [key, entry] of Object.entries(index.files ?? {})) {
    const local = syncState.files[key];
    // No local record — new file, must download.
    if (!local) { changedKeys.push(key); continue; }
    // Hash differs — content changed.
    if (local.hash !== entry.hash) { changedKeys.push(key); continue; }
    // Stale — last sync was > 30 min ago, force re-check.
    if (local.lastSyncTime > 0 && (now - local.lastSyncTime) > STALE_THRESHOLD_MS) {
      changedKeys.push(key);
      continue;
    }
    // Hash matches AND within freshness window — skip.
  }

  if (changedKeys.length === 0) return { downloaded: [], applied: true };

  const downloaded: string[] = [];
  const siteFiles: SiteFilePayload[] = [];
  let configJson: string | null = null;

  for (const key of changedKeys) {
    const content = await downloadFile(remotePathForKey(resolved.directory, key), conn);
    if (content === null) continue;
    downloaded.push(key);

    if (key === CONFIG_FILE_KEY) {
      configJson = content;
    } else {
      const parsed = parseSiteFile(content);
      if (parsed) siteFiles.push(parsed);
    }
  }

  if (siteFiles.length > 0) {
    // Merge changed site files INTO the existing workspace so unchanged sites
    // are preserved — never wholesale-replace with only the downloaded subset.
    const workspace = await getWorkspace();
    for (const file of siteFiles) {
      for (const page of file.pages) {
        workspace.pages[page.id] = page;
      }
    }
    // Recompute rootIds in case a new site root arrived in the download.
    workspace.rootIds = Object.values(workspace.pages)
      .filter((page) => page.type === 'site')
      .sort((a, b) => a.sortIndex - b.sortIndex || a.site.localeCompare(b.site))
      .map((page) => page.id);
    await setWorkspace(workspace);
  }

  if (configJson) {
    const config = parseConfigPayload(configJson);
    if (config) {
      await setMeta(config.meta);
      if (config.locale) setLocale(config.locale);
    }
  }

  const nextStateFiles: Record<string, import('../lib/syncConfig').FileSyncEntry> = {};
  for (const [key, entry] of Object.entries(index.files ?? {})) {
    const local = syncState.files[key];
    // Preserve the per-file sync time for files we didn't actually download
    // this round (they were still fresh). For downloaded files, bump the clock.
    nextStateFiles[key] = {
      hash: entry.hash,
      version: entry.version ?? 0,
      lastSyncTime: downloaded.includes(key) ? now : (local?.lastSyncTime ?? 0),
    };
  }
  await saveSyncState({ files: nextStateFiles, lastSyncedAt: now });

  return { downloaded, applied: true };
}
