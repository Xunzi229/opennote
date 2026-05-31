export type NoteContent = string | Record<string, unknown>;

export interface NoteSource {
  pageUrl: string;
  pageTitle?: string;
  capturedAt: number;
  hostname: string;
}

export type PageType = 'site' | 'page';

export interface PageNode {
  id: string;
  type: PageType;
  site: string;
  parentId: string | null;
  title: string;
  content: NoteContent;
  sortIndex: number;
  collapsed?: boolean;
  source?: NoteSource;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
}

export interface WorkspaceStore {
  pages: Record<string, PageNode>;
  rootIds: string[];
}

export interface MetaStore {
  lastActiveSite: string | null;
  version: number;
  showSidebar?: boolean;
  showNoteList?: boolean;
}

export type PageFilter = 'all' | 'pinned' | 'favorite' | 'tagged';
export type PageSortMode = 'updated' | 'created' | 'title';

export interface TreeRow {
  page: PageNode;
  depth: number;
  hasChildren: boolean;
}

export type Note = PageNode;
export type NoteFilter = PageFilter;
export type NoteSortMode = PageSortMode;
