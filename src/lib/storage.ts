import type { MetaStore, NoteContent, NoteSource, PageNode, WorkspaceStore } from '../types';
import {
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
  serializeWorkspaceMarkdown,
} from './noteBackup';

export const WORKSPACE_KEY = 'workspace';
const META_KEY = 'meta';
let workspaceWriteQueue: Promise<unknown> = Promise.resolve();

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

export async function getWorkspace(): Promise<WorkspaceStore> {
  const result = await chrome.storage.local.get(WORKSPACE_KEY);
  return normalizeWorkspace(result[WORKSPACE_KEY] as WorkspaceStore | undefined);
}

export async function setWorkspace(workspace: WorkspaceStore): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [WORKSPACE_KEY]: normalizeWorkspace(workspace) }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function queueWorkspaceWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = workspaceWriteQueue.then(operation, operation);
  workspaceWriteQueue = next.catch(() => {});
  return next;
}

export async function getMeta(): Promise<MetaStore> {
  const result = await chrome.storage.local.get(META_KEY);
  const meta = result[META_KEY] as MetaStore | undefined;
  return meta || { lastActiveSite: null, version: 2 };
}

export async function setMeta(meta: MetaStore): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [META_KEY]: meta }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
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
    const root = ensureSiteRootInWorkspace(workspace, hostname);
    await setWorkspace(workspace);
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
    const root = ensureSiteRootInWorkspace(workspace, hostname);
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
    workspace.pages[parent.id] = { ...parent, collapsed: false, updatedAt: now };
    await setWorkspace(workspace);
    return page;
  });
}

export async function updatePageContent(id: string, content: NoteContent): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page) return;
    workspace.pages[id] = { ...page, content, updatedAt: Date.now() };
    await setWorkspace(workspace);
  });
}

export async function updatePageTitle(id: string, title: string): Promise<void> {
  return queueWorkspaceWrite(async () => {
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    if (!page || page.type === 'site') return;
    workspace.pages[id] = { ...page, title: title.trim() || 'Untitled', updatedAt: Date.now() };
    await setWorkspace(workspace);
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
    workspace.pages[id] = { ...page, ...meta, updatedAt: Date.now() };
    await setWorkspace(workspace);
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

    for (const pageId of idsToDelete) {
      delete workspace.pages[pageId];
    }
    workspace.rootIds = workspace.rootIds.filter((rootId) => !idsToDelete.has(rootId));
    await setWorkspace(workspace);
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
    const updateSubtreeSite = (pageId: string) => {
      const current = workspace.pages[pageId];
      if (!current) return;
      workspace.pages[pageId] = { ...current, site: nextSite, updatedAt: movedAt };
      for (const child of getChildren(workspace, pageId)) {
        updateSubtreeSite(child.id);
      }
    };

    workspace.pages[id] = {
      ...page,
      parentId: parent.id,
      site: nextSite,
      sortIndex: getChildren(workspace, parent.id).length,
      updatedAt: movedAt,
    };
    workspace.pages[parent.id] = { ...parent, collapsed: false, updatedAt: movedAt };
    for (const child of getChildren(workspace, id)) {
      updateSubtreeSite(child.id);
    }

    await setWorkspace(workspace);
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
    await setWorkspace(workspace);
    return workspace;
  });
}

export async function getWorkspaceStorageUsage(): Promise<StorageUsage> {
  const bytesInUse = await new Promise<number>((resolve, reject) => {
    chrome.storage.local.getBytesInUse(WORKSPACE_KEY, (bytes) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(bytes);
      }
    });
  });
  const localStorageArea = chrome.storage.local as typeof chrome.storage.local & {
    QUOTA_BYTES?: number;
  };

  return {
    bytesInUse,
    quotaBytes: localStorageArea.QUOTA_BYTES,
  };
}

export function onWorkspaceChange(callback: (workspace: WorkspaceStore) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[WORKSPACE_KEY]) {
      callback(normalizeWorkspace(changes[WORKSPACE_KEY].newValue as WorkspaceStore | undefined));
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
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

function isDescendant(workspace: WorkspaceStore, candidateId: string, ancestorId: string): boolean {
  let current = workspace.pages[candidateId];
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = workspace.pages[current.parentId];
  }
  return false;
}
