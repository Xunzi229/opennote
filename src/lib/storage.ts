import type { MetaStore, NoteContent, NoteSource, PageNode, WorkspaceStore } from '../types';
import {
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
  serializeWorkspaceMarkdown,
} from './noteBackup';
import { idbGetAllPages, idbGetKv, idbWrite } from './idb';

export const WORKSPACE_KEY = 'workspace';
// Small change-signal key kept in chrome.storage.local. IndexedDB has no
// cross-context change events, so writers bump this value and every context
// (panel UI, background cache, context menu) listens for it and re-reads IDB.
export const REV_KEY = 'workspace_rev';
const ROOT_IDS_KEY = 'rootIds';
const META_KEY = 'meta';
let workspaceWriteQueue: Promise<unknown> = Promise.resolve();
const memoryStorage: Record<string, unknown> = {};
let revCounter = 0;

export interface StorageUsage {
  bytesInUse: number;
  quotaBytes?: number;
}

export function createEmptyWorkspace(): WorkspaceStore {
  return { pages: {}, rootIds: [] };
}

export function siteRootId(hostname: string): string {
  return `site:${hostname}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

function normalizeWorkspace(workspace: WorkspaceStore | undefined): WorkspaceStore {
  if (!workspace?.pages || !Array.isArray(workspace.rootIds)) return createEmptyWorkspace();
  const rootIds = workspace.rootIds.filter((id) => workspace.pages[id]?.type === 'site');
  return { pages: workspace.pages, rootIds };
}

// --- One-time migration from the legacy single-key chrome.storage workspace ---

let migrated = false;
let migratePromise: Promise<void> | null = null;

async function doMigrate(): Promise<void> {
  // If IDB already holds the rootIds marker, the migration ran before.
  const existingRootIds = await idbGetKv<string[]>(ROOT_IDS_KEY);
  if (existingRootIds !== undefined) {
    migrated = true;
    return;
  }

  const area = getLocalStorageArea();
  let legacy: WorkspaceStore | undefined;
  if (area?.get) {
    const result = await area.get(WORKSPACE_KEY);
    legacy = result[WORKSPACE_KEY] as WorkspaceStore | undefined;
  }

  if (legacy?.pages && Array.isArray(legacy.rootIds)) {
    const normalized = normalizeWorkspace(legacy);
    const pages = Object.values(normalized.pages);
    await idbWrite({ clearAll: true, putPages: pages, kv: { [ROOT_IDS_KEY]: normalized.rootIds } });

    // Verify before trusting the migration. If counts mismatch, leave the
    // legacy key intact and surface an error rather than silently losing data.
    const writtenPages = await idbGetAllPages();
    if (writtenPages.length !== pages.length) {
      throw new Error('IndexedDB migration verification failed');
    }
    // The legacy "workspace" key is intentionally left in place for one release
    // as a safety net; it is cleaned up in a later version.
  } else {
    // No legacy data: write an empty marker so future reads skip migration.
    await idbWrite({ kv: { [ROOT_IDS_KEY]: [] } });
  }

  migrated = true;
}

function migrateFromChromeStorageIfNeeded(): Promise<void> {
  if (migrated) return Promise.resolve();
  if (!migratePromise) {
    migratePromise = doMigrate().finally(() => {
      migratePromise = null;
    });
  }
  return migratePromise;
}

async function bumpRevision(): Promise<void> {
  const area = getLocalStorageArea();
  if (!area?.set) return;
  // Use a monotonic, never-repeating value so onChanged always fires even for
  // multiple writes within the same millisecond.
  const value = `${Date.now()}-${(revCounter += 1)}`;
  return new Promise((resolve, reject) => {
    area.set({ [REV_KEY]: value }, () => {
      const lastError = getRuntimeLastError();
      if (lastError) {
        reject(lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function getWorkspace(): Promise<WorkspaceStore> {
  await migrateFromChromeStorageIfNeeded();
  const [pages, rootIds] = await Promise.all([
    idbGetAllPages(),
    idbGetKv<string[]>(ROOT_IDS_KEY),
  ]);
  const pageMap: Record<string, PageNode> = {};
  for (const page of pages) pageMap[page.id] = page;
  return normalizeWorkspace({ pages: pageMap, rootIds: rootIds ?? [] });
}

export async function setWorkspace(workspace: WorkspaceStore): Promise<void> {
  const normalized = normalizeWorkspace(workspace);
  await idbWrite({
    clearAll: true,
    putPages: Object.values(normalized.pages),
    kv: { [ROOT_IDS_KEY]: normalized.rootIds },
  });
  migrated = true;
  await bumpRevision();
}

function queueWorkspaceWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = workspaceWriteQueue.then(operation, operation);
  workspaceWriteQueue = next.catch(() => {});
  return next;
}

export async function getMeta(): Promise<MetaStore> {
  const storage = getLocalStorageArea();
  if (!storage?.get) {
    return (memoryStorage[META_KEY] as MetaStore | undefined) || { lastActiveSite: null, version: 2 };
  }

  const result = await storage.get(META_KEY);
  const meta = result[META_KEY] as MetaStore | undefined;
  return meta || { lastActiveSite: null, version: 2 };
}

export async function setMeta(meta: MetaStore): Promise<void> {
  const storage = getLocalStorageArea();
  if (!storage?.set) {
    memoryStorage[META_KEY] = meta;
    return;
  }

  return new Promise((resolve, reject) => {
    storage.set({ [META_KEY]: meta }, () => {
      const lastError = getRuntimeLastError();
      if (lastError) {
        reject(lastError);
      } else {
        resolve();
      }
    });
  });
}

function getChildren(workspace: WorkspaceStore, parentId: string): PageNode[] {
  return Object.values(workspace.pages).filter((page) => page.parentId === parentId);
}

function createSiteRoot(hostname: string, sortIndex: number): PageNode {
  const now = Date.now();
  return {
    id: siteRootId(hostname),
    type: 'site',
    site: hostname,
    parentId: null,
    title: hostname,
    content: '',
    sortIndex,
    collapsed: false,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    favorite: false,
    tags: [],
  };
}

function ensureSiteRootInWorkspace(workspace: WorkspaceStore, hostname: string): PageNode {
  const id = siteRootId(hostname);
  const existing = workspace.pages[id];
  if (existing) return existing;

  const root = createSiteRoot(hostname, workspace.rootIds.length);
  workspace.pages[root.id] = root;
  workspace.rootIds.push(root.id);
  return root;
}

export async function ensureSiteRoot(hostname: string): Promise<PageNode> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const rootsBefore = workspace.rootIds.length;
    const root = ensureSiteRootInWorkspace(workspace, hostname);
    if (workspace.rootIds.length !== rootsBefore) {
      await idbWrite({ putPages: [root], kv: { [ROOT_IDS_KEY]: workspace.rootIds } });
      await bumpRevision();
    }
    return root;
  });
}

export async function addPage(
  hostname: string,
  parentId: string | null,
  content: NoteContent,
  title: string,
  source?: NoteSource,
): Promise<PageNode> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const rootsBefore = workspace.rootIds.length;
    const root = ensureSiteRootInWorkspace(workspace, hostname);
    const rootCreated = workspace.rootIds.length !== rootsBefore;
    const resolvedParentId = parentId && workspace.pages[parentId] ? parentId : root.id;
    const parent = workspace.pages[resolvedParentId] ?? root;
    const now = Date.now();
    const page: PageNode = {
      id: generateId(),
      type: 'page',
      site: parent.site,
      parentId: parent.id,
      title: title.trim() || 'Untitled',
      content,
      sortIndex: getChildren(workspace, parent.id).length,
      collapsed: false,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      favorite: false,
      tags: [],
      ...(source ? { source } : {}),
    };

    workspace.pages[page.id] = page;
    const updatedParent = { ...parent, collapsed: false, updatedAt: now };
    workspace.pages[parent.id] = updatedParent;

    await idbWrite({
      putPages: [page, updatedParent],
      ...(rootCreated ? { kv: { [ROOT_IDS_KEY]: workspace.rootIds } } : {}),
    });
    await bumpRevision();
    return page;
  });
}

export async function updatePageContent(id: string, content: NoteContent): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page) return;
    const updated = { ...page, content, updatedAt: Date.now() };
    await idbWrite({ putPages: [updated] });
    await bumpRevision();
  });
}

export async function updatePageTitle(id: string, title: string): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page || page.type === 'site') return;
    const updated = { ...page, title: title.trim() || 'Untitled', updatedAt: Date.now() };
    await idbWrite({ putPages: [updated] });
    await bumpRevision();
  });
}

export async function updatePageMeta(
  id: string,
  meta: Partial<Pick<PageNode, 'pinned' | 'favorite' | 'tags' | 'collapsed'>>,
): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page) return;
    const updated = { ...page, ...meta, updatedAt: Date.now() };
    await idbWrite({ putPages: [updated] });
    await bumpRevision();
  });
}

export async function deletePage(id: string): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page) return;

    const idsToDelete = new Set<string>();
    const collect = (pageId: string) => {
      idsToDelete.add(pageId);
      for (const child of getChildren(workspace, pageId)) {
        collect(child.id);
      }
    };
    collect(id);

    const nextRootIds = workspace.rootIds.filter((rootId) => !idsToDelete.has(rootId));
    const rootIdsChanged = nextRootIds.length !== workspace.rootIds.length;

    await idbWrite({
      deletePageIds: [...idsToDelete],
      ...(rootIdsChanged ? { kv: { [ROOT_IDS_KEY]: nextRootIds } } : {}),
    });
    await bumpRevision();
  });
}

export async function movePage(id: string, newParentId: string): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    const parent = workspace.pages[newParentId];
    if (!page || !parent || page.type === 'site' || page.id === parent.id) return;
    if (isDescendant(workspace, parent.id, page.id)) return;

    const movedAt = Date.now();
    const nextSite = parent.site;
    const changed: PageNode[] = [];

    const updateSubtreeSite = (pageId: string) => {
      const current = workspace.pages[pageId];
      if (!current) return;
      const updated = { ...current, site: nextSite, updatedAt: movedAt };
      workspace.pages[pageId] = updated;
      changed.push(updated);
      for (const child of getChildren(workspace, pageId)) {
        updateSubtreeSite(child.id);
      }
    };

    const movedPage = {
      ...page,
      parentId: parent.id,
      site: nextSite,
      sortIndex: getChildren(workspace, parent.id).length,
      updatedAt: movedAt,
    };
    workspace.pages[id] = movedPage;
    changed.push(movedPage);

    const updatedParent = { ...parent, collapsed: false, updatedAt: movedAt };
    workspace.pages[parent.id] = updatedParent;
    changed.push(updatedParent);

    for (const child of getChildren(workspace, id)) {
      updateSubtreeSite(child.id);
    }

    await idbWrite({ putPages: changed });
    await bumpRevision();
  });
}

export async function deleteSite(hostname: string): Promise<void> {
  await deletePage(siteRootId(hostname));
}

export async function exportWorkspaceBackup(exportedAt = Date.now()): Promise<string> {
  return serializeWorkspaceBackup(await getWorkspace(), exportedAt);
}

export async function exportWorkspaceMarkdown(exportedAt = Date.now()): Promise<string> {
  return serializeWorkspaceMarkdown(await getWorkspace(), exportedAt);
}

export async function importWorkspaceBackup(json: string): Promise<WorkspaceStore> {
  const workspace = parseWorkspaceBackup(json);
  return queueWorkspaceWrite(async () => {
    const normalized = normalizeWorkspace(workspace);
    await idbWrite({
      clearAll: true,
      putPages: Object.values(normalized.pages),
      kv: { [ROOT_IDS_KEY]: normalized.rootIds },
    });
    migrated = true;
    await bumpRevision();
    return normalized;
  });
}

export async function getWorkspaceStorageUsage(): Promise<StorageUsage> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    return { bytesInUse: usage ?? 0, quotaBytes: quota };
  }

  // Fallback: estimate from the serialized page set.
  const pages = await idbGetAllPages();
  const bytesInUse = new TextEncoder().encode(JSON.stringify(pages)).length;
  return { bytesInUse };
}

export function onWorkspaceChange(callback: (workspace: WorkspaceStore) => void): () => void {
  const storageEvents = typeof chrome === 'undefined' ? undefined : chrome.storage?.onChanged;
  if (!storageEvents?.addListener || !storageEvents.removeListener) {
    return () => undefined;
  }

  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local' || !changes[REV_KEY]) return;
    void getWorkspace().then(callback);
  };
  storageEvents.addListener(listener);
  return () => storageEvents.removeListener(listener);
}

export const getNotes = getWorkspace;
export const setNotes = setWorkspace;
export function addNote(
  hostname: string,
  content: NoteContent,
  title: string,
  source?: NoteSource,
): Promise<PageNode> {
  return addPage(hostname, null, content, title, source);
}
export const updateNote = (_site: string, id: string, content: NoteContent) => updatePageContent(id, content);
export const deleteNote = (_site: string, id: string) => deletePage(id);
export const updateNoteTitle = (_site: string, id: string, title: string) => updatePageTitle(id, title);
export const updateNoteMeta = (_site: string, id: string, meta: Partial<Pick<PageNode, 'pinned' | 'favorite' | 'tags'>>) =>
  updatePageMeta(id, meta);
export const exportNotesBackup = exportWorkspaceBackup;
export const exportNotesMarkdown = exportWorkspaceMarkdown;
export const importNotesBackup = importWorkspaceBackup;
export const getNotesStorageUsage = getWorkspaceStorageUsage;
export const onNotesChange = onWorkspaceChange;

// Test-only: reset the one-time migration guard so each test starts clean.
export function __resetStorageForTests(): void {
  migrated = false;
  migratePromise = null;
  for (const key of Object.keys(memoryStorage)) delete memoryStorage[key];
}

function getLocalStorageArea(): typeof chrome.storage.local | undefined {
  if (typeof chrome === 'undefined') return undefined;
  return chrome.storage?.local;
}

function getRuntimeLastError(): chrome.runtime.LastError | undefined {
  if (typeof chrome === 'undefined') return undefined;
  return chrome.runtime?.lastError;
}

function isDescendant(workspace: WorkspaceStore, candidateId: string, ancestorId: string): boolean {
  let current = workspace.pages[candidateId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = workspace.pages[current.parentId];
  }
  return false;
}
