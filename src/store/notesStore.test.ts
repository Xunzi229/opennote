import { describe, it, expect, beforeEach } from 'vitest';
import { useNotesStore } from './notesStore';

describe('notesStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNotesStore.setState({
      notes: {},
      currentSite: null,
      searchQuery: '',
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
          { id: '1', content: {}, createdAt: 1, updatedAt: 1 },
          { id: '2', content: {}, createdAt: 2, updatedAt: 2 },
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
          { id: '1', content: { text: 'hello world' }, createdAt: 1, updatedAt: 1 },
          { id: '2', content: { text: 'foo bar' }, createdAt: 2, updatedAt: 2 },
        ],
      },
      searchQuery: 'hello',
    });

    const { filteredNotes } = useNotesStore.getState();
    const result = filteredNotes('example.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});