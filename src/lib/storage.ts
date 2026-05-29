import type { NotesStore, MetaStore, Note } from '../types';

const NOTES_KEY = 'notes';
const META_KEY = 'meta';

function generateId(): string {
  return crypto.randomUUID();
}

export async function getNotes(): Promise<NotesStore> {
  const result = await chrome.storage.local.get(NOTES_KEY);
  return (result[NOTES_KEY] as NotesStore) || {};
}

export async function setNotes(notes: NotesStore): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [NOTES_KEY]: notes as any }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
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

export async function addNote(hostname: string, content: any): Promise<Note> {
  const notes = await getNotes();
  const now = Date.now();
  const note: Note = {
    id: generateId(),
    content,
    createdAt: now,
    updatedAt: now,
  };

  if (!notes[hostname]) {
    notes[hostname] = [];
  }
  notes[hostname].push(note);

  await setNotes(notes);
  return note;
}

export async function updateNote(hostname: string, id: string, content: any): Promise<void> {
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
}

export async function deleteNote(hostname: string, id: string): Promise<void> {
  const notes = await getNotes();
  if (!notes[hostname]) return;

  notes[hostname] = notes[hostname].filter((n) => n.id !== id);
  if (notes[hostname].length === 0) {
    delete notes[hostname];
  }

  await setNotes(notes);
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