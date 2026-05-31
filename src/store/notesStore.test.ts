import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotesStore } from './notesStore';
import { addNote, getNotes, setNotes } from '../lib/storage';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | object, callback?: (result: Record<string, unknown>) => void) => {
        const result =
          typeof keys === 'string'
            ? { [keys]: mockStorage[keys] }
            : Array.isArray(keys)
              ? Object.fromEntries(keys.map((key) => [key, mockStorage[key]]))
              : mockStorage;
        callback?.(result);
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
        return Promise.resolve();
      }),
      getBytesInUse: vi.fn((_keys: string | string[] | null, callback?: (bytes: number) => void) => {
        callback?.(0);
        return Promise.resolve(0);
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

describe('notesStore', () => {
  beforeEach(() => {
    mockStorage.notes = undefined;
    // Reset store state before each test
    useNotesStore.setState({
      notes: {},
      currentSite: null,
      selectedNoteId: null,
      searchQuery: '',
      noteFilter: 'all',
      noteSortMode: 'updated',
      isLoading: false,
      error: null,
    });
  });

  it('setCurrentSite updates currentSite', () => {
    const { setCurrentSite } = useNotesStore.getState();
    setCurrentSite('example.com');
    expect(useNotesStore.getState().currentSite).toBe('example.com');
  });

  it('setSearchQuery updates searchQuery', () => {
    const { setSearchQuery } = useNotesStore.getState();
    setSearchQuery('test');
    expect(useNotesStore.getState().searchQuery).toBe('test');
  });

  it('filteredNotes returns all notes when searchQuery is empty', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Note 1', content: {}, createdAt: 1, updatedAt: 1 },
          { id: '2', title: 'Note 2', content: {}, createdAt: 2, updatedAt: 2 },
        ],
      },
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(2);
  });

  it('filteredNotes filters by searchQuery in content', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Note 1', content: 'hello world', createdAt: 1, updatedAt: 1 },
          { id: '2', title: 'Note 2', content: 'foo bar', createdAt: 2, updatedAt: 2 },
        ],
      },
      searchQuery: 'hello',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filteredNotes filters by searchQuery in title', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Meeting notes', content: {}, createdAt: 1, updatedAt: 1 },
          { id: '2', title: 'Other', content: {}, createdAt: 2, updatedAt: 2 },
        ],
      },
      searchQuery: 'meeting',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filteredNotes filters by source title and url', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          {
            id: '1',
            title: 'Saved snippet',
            content: 'body',
            createdAt: 1,
            updatedAt: 1,
            source: {
              pageUrl: 'https://example.com/deep-guide',
              pageTitle: 'Deep Guide',
              capturedAt: 1,
              hostname: 'example.com',
            },
          },
          { id: '2', title: 'Other', content: 'body', createdAt: 2, updatedAt: 2 },
        ],
      },
      searchQuery: 'deep-guide',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filteredNotes filters favorite notes', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Favorite', content: 'hello', createdAt: 1, updatedAt: 1, favorite: true },
          { id: '2', title: 'Regular', content: 'world', createdAt: 2, updatedAt: 2, favorite: false },
        ],
      },
      noteFilter: 'favorite',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filteredNotes filters pinned notes', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Pinned', content: 'hello', createdAt: 1, updatedAt: 1, pinned: true },
          { id: '2', title: 'Regular', content: 'world', createdAt: 2, updatedAt: 2, pinned: false },
        ],
      },
      noteFilter: 'pinned',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filteredSites returns all sites when searchQuery is empty', () => {
    useNotesStore.setState({
      notes: {
        'a.com': [{ id: '1', title: 'A', content: {}, createdAt: 1, updatedAt: 1 }],
        'b.com': [{ id: '2', title: 'B', content: {}, createdAt: 2, updatedAt: 2 }],
      },
    });

    const { filteredSites } = useNotesStore.getState();
    expect(filteredSites()).toEqual(['a.com', 'b.com']);
  });

  it('filteredSites filters by hostname or note content', () => {
    useNotesStore.setState({
      notes: {
        'github.com': [{ id: '1', title: 'Repo', content: 'typescript notes', createdAt: 1, updatedAt: 1 }],
        'google.com': [{ id: '2', title: 'Search', content: 'query page', createdAt: 2, updatedAt: 2 }],
      },
      searchQuery: 'typescript',
    });

    const { filteredSites } = useNotesStore.getState();
    expect(filteredSites()).toEqual(['github.com']);
  });

  it('sortedNotes can sort by title while keeping pinned notes first', () => {
    useNotesStore.setState({
      notes: {
        'example.com': [
          { id: '1', title: 'Zulu', content: 'z', createdAt: 1, updatedAt: 3 },
          { id: '2', title: 'Alpha', content: 'a', createdAt: 2, updatedAt: 2 },
          { id: '3', title: 'Pinned Beta', content: 'p', createdAt: 3, updatedAt: 1, pinned: true },
        ],
      },
      noteSortMode: 'title',
    });

    const { sortedNotes } = useNotesStore.getState();
    expect(sortedNotes('example.com').map((note) => note.id)).toEqual(['3', '2', '1']);
  });

  it('cycles note sort mode', () => {
    const { cycleNoteSortMode } = useNotesStore.getState();
    cycleNoteSortMode();
    expect(useNotesStore.getState().noteSortMode).toBe('created');
    cycleNoteSortMode();
    expect(useNotesStore.getState().noteSortMode).toBe('title');
    cycleNoteSortMode();
    expect(useNotesStore.getState().noteSortMode).toBe('updated');
  });

  it('removeNoteTag removes one tag and keeps the rest', async () => {
    const note = await addNote('example.com', 'hello', 'Tagged note');
    await setNotes({
      'example.com': [
        {
          ...note,
          tags: ['docs', 'research'],
        },
      ],
    });
    useNotesStore.setState({ notes: await getNotes() });

    await useNotesStore.getState().removeNoteTag('example.com', note.id, 'docs');

    const notes = await getNotes();
    expect(notes['example.com'][0].tags).toEqual(['research']);
  });

  it('addNoteTag trims tags and ignores case-insensitive duplicates', async () => {
    const note = await addNote('example.com', 'hello', 'Tagged note');
    await setNotes({
      'example.com': [
        {
          ...note,
          tags: ['Docs'],
        },
      ],
    });
    useNotesStore.setState({ notes: await getNotes() });

    await useNotesStore.getState().addNoteTag('example.com', note.id, ' docs ');
    await useNotesStore.getState().addNoteTag('example.com', note.id, 'Research');
    await useNotesStore.getState().addNoteTag('example.com', note.id, '   ');

    const notes = await getNotes();
    expect(notes['example.com'][0].tags).toEqual(['Docs', 'Research']);
  });
});
