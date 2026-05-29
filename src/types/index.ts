export interface Note {
  id: string;
  title: string;
  content: any; // ProseMirror JSON from TipTap
  createdAt: number;
  updatedAt: number;
}

export interface NotesStore {
  [hostname: string]: Note[];
}

export interface MetaStore {
  lastActiveSite: string | null;
  version: number;
}