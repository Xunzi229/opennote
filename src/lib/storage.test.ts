import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNotes,
  setNotes,
  addNote,
  updateNote,
  deleteNote,
  exportNotesBackup,
  exportNotesMarkdown,
  importNotesBackup,
  getNotesStorageUsage,
} from './storage';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};

beforeEach(() => {
  mockStorage.notes = undefined;
  vi.clearAllMocks();
});

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
        let result: Record<string, unknown> = {};
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
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      getBytesInUse: vi.fn((_keys: string | string[] | null, callback?: (bytes: number) => void) => {
        const bytes = 2048;
        if (callback) {
          callback(bytes);
        }
        return Promise.resolve(bytes);
      }),
      QUOTA_BYTES: 10485760,
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
    const note = await addNote('example.com', content, 'Test Note');

    expect(note.id).toBeDefined();
    expect(note.content).toEqual(content);
    expect(note.createdAt).toBeTypeOf('number');
    expect(note.updatedAt).toBeTypeOf('number');
  });

  it('serializes concurrent note writes so additions are not lost', async () => {
    const [first, second] = await Promise.all([
      addNote('example.com', 'first', 'First'),
      addNote('example.com', 'second', 'Second'),
    ]);

    const notes = await getNotes();
    expect(notes['example.com'].map((note) => note.id).sort()).toEqual([first.id, second.id].sort());
  });

  it('updateNote modifies existing note content', async () => {
    const note = await addNote('example.com', { type: 'doc' }, 'Test Note');
    const newContent = { type: 'doc', content: [{ type: 'paragraph' }] };

    await updateNote('example.com', note.id, newContent);

    const notes = await getNotes();
    expect(notes['example.com'][0].content).toEqual(newContent);
  });

  it('serializes concurrent updates to different notes', async () => {
    const first = await addNote('example.com', 'old first', 'First');
    const second = await addNote('example.com', 'old second', 'Second');

    await Promise.all([
      updateNote('example.com', first.id, 'new first'),
      updateNote('example.com', second.id, 'new second'),
    ]);

    const notes = await getNotes();
    expect(notes['example.com'].find((note) => note.id === first.id)?.content).toBe('new first');
    expect(notes['example.com'].find((note) => note.id === second.id)?.content).toBe('new second');
  });

  it('deleteNote removes a note from storage', async () => {
    const note = await addNote('example.com', { type: 'doc' }, 'Test Note');
    await deleteNote('example.com', note.id);

    const notes = await getNotes();
    expect(notes['example.com']).toBeUndefined();
  });

  it('exports and imports notes backup JSON', async () => {
    const note = await addNote('example.com', 'hello', 'Test Note');
    const backup = await exportNotesBackup(123);

    await setNotes({});
    await importNotesBackup(backup);

    const notes = await getNotes();
    expect(notes['example.com'][0]).toEqual(note);
  });

  it('exports notes as markdown', async () => {
    await addNote('example.com', 'hello markdown', 'Markdown Note');
    const markdown = await exportNotesMarkdown(123);

    expect(markdown).toContain('# OpenNote Export');
    expect(markdown).toContain('## example.com');
    expect(markdown).toContain('### Markdown Note');
    expect(markdown).toContain('hello markdown');
  });

  it('returns local notes storage usage', async () => {
    await expect(getNotesStorageUsage()).resolves.toEqual({
      bytesInUse: 2048,
      quotaBytes: 10485760,
    });
  });
});
