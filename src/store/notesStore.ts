import { create } from 'zustand';
import type { NotesStore, Note } from '../types';
import {
  getNotes,
  addNote as storageAddNote,
  updateNote as storageUpdateNote,
  deleteNote as storageDeleteNote,
  updateNoteTitle as storageUpdateNoteTitle,
  deleteSite as storageDeleteSite,
  onNotesChange,
} from '../lib/storage';
import { contentToMarkdown } from '../lib/markdownContent';
import { toast } from 'sonner';

interface NotesState {
  notes: NotesStore;
  currentSite: string | null;
  selectedNoteId: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  loadNotes: () => Promise<void>;
  setCurrentSite: (site: string | null) => void;
  addNote: (site: string, content: any, title?: string) => Promise<Note>;
  updateNote: (site: string, id: string, content: any) => Promise<void>;
  deleteNote: (site: string, id: string) => Promise<void>;
  updateNoteTitle: (site: string, id: string, title: string) => Promise<void>;
  deleteSite: (site: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  filteredSites: () => string[];
  filteredNotes: (site: string) => Note[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: {},
  currentSite: null,
  selectedNoteId: null,
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

  addNote: async (site, content, title) => {
    try {
      const noteTitle = title || '新笔记';
	      const note = await storageAddNote(site, content, noteTitle);
      const notes = await getNotes();
      set({ notes });
      return note;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add note';
      if (message.includes('QUOTA_BYTES')) {
        toast.error('存储空间不足，请删除部分笔记');
      } else {
        set({ error: message });
      }
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
      if (message.includes('QUOTA_BYTES')) {
        toast.error('存储空间不足，请删除部分笔记');
      } else {
        set({ error: message });
      }
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

  updateNoteTitle: async (site, id, title) => {
    try {
      await storageUpdateNoteTitle(site, id, title);
      const notes = await getNotes();
      set({ notes });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update title';
      set({ error: message });
      throw err;
    }
  },

  deleteSite: async (site) => {
    try {
      await storageDeleteSite(site);
      const notes = await getNotes();
      const remainingSites = Object.keys(notes).sort();
      set({
        notes,
        currentSite:
          get().currentSite === site ? remainingSites[0] ?? null : get().currentSite,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete site';
      set({ error: message });
      throw err;
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  filteredSites: () => {
    const { notes, searchQuery } = get();
    const hostnames = Object.keys(notes).sort();
    if (!searchQuery) return hostnames;

    const query = searchQuery.toLowerCase();
    return hostnames.filter((hostname) => {
      if (hostname.toLowerCase().includes(query)) return true;
      return (notes[hostname] || []).some((note) => noteMatchesQuery(note, query));
    });
  },

  filteredNotes: (site) => {
    const { notes, searchQuery } = get();
    const siteNotes = notes[site] || [];
    if (!searchQuery) return siteNotes;

    const query = searchQuery.toLowerCase();
    return siteNotes.filter((note) => noteMatchesQuery(note, query));
  },
}));

function noteMatchesQuery(note: Note, query: string): boolean {
  if (note.title.toLowerCase().includes(query)) return true;
  return contentToMarkdown(note.content).toLowerCase().includes(query);
}

// Subscribe to storage changes for cross-panel sync
onNotesChange((notes) => {
  useNotesStore.setState({ notes });
});