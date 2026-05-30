import type { NotesStore } from '../types';
import { getNotes } from './storage';

let cache: NotesStore = {};
let initialized = false;
let initPromise: Promise<void> | null = null;

export function initNotesCache() {
  if (!initPromise) {
    initPromise = getNotes().then((notes) => {
      cache = notes;
      initialized = true;
    });
  }
  return initPromise;
}

export function bindNotesCacheSync() {
  void initNotesCache();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.notes) return;
    cache = (changes.notes.newValue as NotesStore) || {};
    initialized = true;
  });
}

export function getCachedNotes(): NotesStore {
  return cache;
}

export function isNotesCacheReady(): boolean {
  return initialized;
}

export async function ensureNotesCacheReady() {
  await initNotesCache();
  return cache;
}
