import type { WorkspaceStore } from '../types';
import { getWorkspace, WORKSPACE_KEY, createEmptyWorkspace } from './storage';

let cache: WorkspaceStore = createEmptyWorkspace();
let initialized = false;
let initPromise: Promise<void> | null = null;

export function initNotesCache() {
  if (!initPromise) {
    initPromise = getWorkspace().then((workspace) => {
      cache = workspace;
      initialized = true;
    });
  }
  return initPromise;
}

export function bindNotesCacheSync() {
  void initNotesCache();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[WORKSPACE_KEY]) return;
    cache = (changes[WORKSPACE_KEY].newValue as WorkspaceStore) || createEmptyWorkspace();
    initialized = true;
  });
}

export function getCachedNotes(): WorkspaceStore {
  return cache;
}

export function isNotesCacheReady(): boolean {
  return initialized;
}

export async function ensureNotesCacheReady() {
  await initNotesCache();
  return cache;
}
