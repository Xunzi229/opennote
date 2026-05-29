export interface Note {
  id: string;
  title: string;
  content: string | Record<string, unknown>; // Markdown 字符串，兼容旧 ProseMirror JSON
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