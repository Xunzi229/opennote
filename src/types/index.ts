export type NoteContent = string | Record<string, unknown>;

export interface NoteSource {
  pageUrl: string;
  pageTitle?: string;
  capturedAt: number;
  hostname: string;
}

export interface Note {
  id: string;
  title: string;
  content: NoteContent;
  source?: NoteSource;
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

export type NoteFilter = 'all' | 'pinned' | 'favorite' | 'tagged';
export type NoteSortMode = 'updated' | 'created' | 'title';
