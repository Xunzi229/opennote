import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNotes, setNotes, addNote, updateNote, deleteNote } from './storage';

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};

beforeEach(() => {
  mockStorage.notes = undefined;
  vi.clearAllMocks();
});

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: any) => void) => {
        let result: Record<string, any> = {};
        if (typeof keys === 'string') {
          result = { [keys]: mockStorage[keys] };
        } else if (Array.isArray(keys)) {
          keys.forEach((k) => {
            result[k] = mockStorage[k];
          });
        } else {
          result = mockStorage;
        }
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, any>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
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

describe('storage utilities', () => {
  it('getNotes returns empty object when no notes exist', async () => {
    const notes = await getNotes();
    expect(notes).toEqual({});
  });

  it('setNotes and getNotes persist data', async () => {
    const testNotes = { 'example.com': [] };
    await setNotes(testNotes);
    const notes = await getNotes();
    expect(notes).toEqual(testNotes);
  });

  it('addNote creates a note with generated id and timestamps', async () => {
    const content = { type: 'doc', content: [] };
    const note = await addNote('example.com', content);

    expect(note.id).toBeDefined();
    expect(note.content).toEqual(content);
    expect(note.createdAt).toBeTypeOf('number');
    expect(note.updatedAt).toBeTypeOf('number');
  });

  it('updateNote modifies existing note content', async () => {
    const note = await addNote('example.com', { type: 'doc' });
    const newContent = { type: 'doc', content: [{ type: 'paragraph' }] };

    await updateNote('example.com', note.id, newContent);

    const notes = await getNotes();
    expect(notes['example.com'][0].content).toEqual(newContent);
  });

  it('deleteNote removes a note from storage', async () => {
    const note = await addNote('example.com', { type: 'doc' });
    await deleteNote('example.com', note.id);

    const notes = await getNotes();
    expect(notes['example.com']).toBeUndefined();
  });
});