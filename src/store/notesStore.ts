import { create } from 'zustand';
import { NotesStore, Note } from '../types';
import {
  getNotes,
  setNotes,
  addNote as storageAddNote,
  updateNote as storageUpdateNote,
  deleteNote as storageDeleteNote,
  onNotesChange,
} from '../lib/storage';

interface NotesState {
  notes: NotesStore;
  currentSite: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  loadNotes: () => Promise<void>;
  setCurrentSite: (site: string | null) => void;
  addNote: (site: string, content: any) => Promise<Note>;
  updateNote: (site: string, id: string, content: any) => Promise<void>;
  deleteNote: (site: string, id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  filteredNotes: (site: string) => Note[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: {},
  currentSite: null,
  searchQuery: '',
  isLoading: false,
  error: null,

  loadNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await getNotes();
      set({ notes, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load notes',
        isLoading: false,
      });
    }
  },

  setCurrentSite: (site) => {
    set({ currentSite: site });
  },

  addNote: async (site, content) => {
    try {
      const note = await storageAddNote(site, content);
      const notes = await getNotes();
      set({ notes });
      return note;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add note';
      set({ error: message });
      throw err;
    }
  },

  updateNote: async (site, id, content) => {
    try {
      await storageUpdateNote(site, id, content);
      const notes = await getNotes();
      set({ notes });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update note';
      set({ error: message });
      throw err;
    }
  },

  deleteNote: async (site, id) => {
    try {
      await storageDeleteNote(site, id);
      const notes = await getNotes();
      set({ notes });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note';
      set({ error: message });
      throw err;
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  filteredNotes: (site) => {
    const { notes, searchQuery } = get();
    const siteNotes = notes[site] || [];
    if (!searchQuery) return siteNotes;

    const query = searchQuery.toLowerCase();
    return siteNotes.filter((note) => {
      // Simple content search - check if query exists in JSON stringified content
      const contentStr = JSON.stringify(note.content).toLowerCase();
      return contentStr.includes(query);
    });
  },
}));

// Subscribe to storage changes for cross-panel sync
onNotesChange((notes) => {
  useNotesStore.setState({ notes });
});