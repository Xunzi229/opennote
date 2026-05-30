export interface Note {
  id: string;
  title: string;
  content: string | Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
}

export interface NotesStore {
  [hostname: string]: Note[];
}

export interface MetaStore {
  lastActiveSite: string | null;
  version: number;
  showSidebar?: boolean;
  showNoteList?: boolean;
}

export type NoteFilter = 'all' | 'pinned' | 'tagged';
