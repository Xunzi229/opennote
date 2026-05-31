import type { NotesStore, MetaStore, Note, NoteContent, NoteSource } from '../types';
import { parseNotesBackup, serializeNotesBackup, serializeNotesMarkdown } from './noteBackup';

const NOTES_KEY = 'notes';
const META_KEY = 'meta';
let notesWriteQueue: Promise<unknown> = Promise.resolve();

export interface StorageUsage {
  bytesInUse: number;
  quotaBytes?: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function getNotes(): Promise<NotesStore> {
  const result = await chrome.storage.local.get(NOTES_KEY);
  return (result[NOTES_KEY] as NotesStore) || {};
}

export async function setNotes(notes: NotesStore): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [NOTES_KEY]: notes }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function queueNotesWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = notesWriteQueue.then(operation, operation);
  notesWriteQueue = next.catch(() => {});
  return next;
}

export async function getMeta(): Promise<MetaStore> {
  const result = await chrome.storage.local.get(META_KEY);
  const meta = result[META_KEY] as MetaStore | undefined;
  return meta || { lastActiveSite: null, version: 1 };
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

export async function addNote(
  hostname: string,
  content: NoteContent,
  title: string,
  source?: NoteSource,
): Promise<Note> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    const now = Date.now();
    const note: Note = {
      id: generateId(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      favorite: false,
      tags: [],
      ...(source ? { source } : {}),
    };

    if (!notes[hostname]) {
      notes[hostname] = [];
    }
    notes[hostname].push(note);

    await setNotes(notes);
    return note;
  });
}

export async function updateNote(hostname: string, id: string, content: NoteContent): Promise<void> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    if (!notes[hostname]) return;

    const noteIndex = notes[hostname].findIndex((n) => n.id === id);
    if (noteIndex === -1) return;

    notes[hostname][noteIndex] = {
      ...notes[hostname][noteIndex],
      content,
      updatedAt: Date.now(),
    };

    await setNotes(notes);
  });
}

export async function deleteNote(hostname: string, id: string): Promise<void> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    if (!notes[hostname]) return;

    notes[hostname] = notes[hostname].filter((n) => n.id !== id);
    if (notes[hostname].length === 0) {
      delete notes[hostname];
    }

    await setNotes(notes);
  });
}

export async function updateNoteTitle(hostname: string, id: string, title: string): Promise<void> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    if (!notes[hostname]) return;

    const noteIndex = notes[hostname].findIndex((n) => n.id === id);
    if (noteIndex === -1) return;

    notes[hostname][noteIndex] = {
      ...notes[hostname][noteIndex],
      title,
      updatedAt: Date.now(),
    };

    await setNotes(notes);
  });
}

export async function updateNoteMeta(
  hostname: string,
  id: string,
  meta: Partial<Pick<Note, 'pinned' | 'favorite' | 'tags'>>,
): Promise<void> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    if (!notes[hostname]) return;

    const noteIndex = notes[hostname].findIndex((n) => n.id === id);
    if (noteIndex === -1) return;

    notes[hostname][noteIndex] = {
      ...notes[hostname][noteIndex],
      ...meta,
      updatedAt: Date.now(),
    };

    await setNotes(notes);
  });
}

export async function deleteSite(hostname: string): Promise<void> {
  return queueNotesWrite(async () => {
    const notes = await getNotes();
    delete notes[hostname];
    await setNotes(notes);
  });
}

export async function exportNotesBackup(exportedAt = Date.now()): Promise<string> {
  return serializeNotesBackup(await getNotes(), exportedAt);
}

export async function exportNotesMarkdown(exportedAt = Date.now()): Promise<string> {
  return serializeNotesMarkdown(await getNotes(), exportedAt);
}

export async function importNotesBackup(json: string): Promise<NotesStore> {
  const notes = parseNotesBackup(json);
  return queueNotesWrite(async () => {
    await setNotes(notes);
    return notes;
  });
}

export async function getNotesStorageUsage(): Promise<StorageUsage> {
  const bytesInUse = await new Promise<number>((resolve, reject) => {
    chrome.storage.local.getBytesInUse(NOTES_KEY, (bytes) => {
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

export function onNotesChange(callback: (notes: NotesStore) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[NOTES_KEY]) {
      callback((changes[NOTES_KEY].newValue as NotesStore) || {});
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
