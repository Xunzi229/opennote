import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  NoteContent,
  NoteSource,
  PageFilter,
  PageNode,
  PageSortMode,
  TreeRow,
  WorkspaceStore,
} from '../types';
import {
  addPage as storageAddPage,
  createEmptyWorkspace,
  deletePage as storageDeletePage,
  deleteSite as storageDeleteSite,
  ensureSiteRoot as storageEnsureSiteRoot,
  getWorkspace,
  getMeta,
  movePage as storageMovePage,
  onWorkspaceChange,
  setMeta,
  siteRootId,
  updatePageContent as storageUpdatePageContent,
  updatePageMeta as storageUpdatePageMeta,
  updatePageTitle as storageUpdatePageTitle,
} from '../lib/storage';
import { contentToMarkdown } from '../lib/markdownContent';
import { t } from '../i18n';

interface NotesState {
  workspace: WorkspaceStore;
  currentSite: string | null;
  selectedPageId: string | null;
  selectedNoteId: string | null;
  searchQuery: string;
  pageFilter: PageFilter;
  noteFilter: PageFilter;
  pageSortMode: PageSortMode;
  noteSortMode: PageSortMode;
  isLoading: boolean;
  error: string | null;

  loadWorkspace: () => Promise<void>;
  loadNotes: () => Promise<void>;
  setCurrentSite: (site: string | null) => void;
  setSelectedPageId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  selectPage: (pageId: string) => void;
  selectNote: (site: string, pageId: string) => void;
  ensureSiteRoot: (site: string) => Promise<PageNode>;
  setPageFilter: (filter: PageFilter) => void;
  setNoteFilter: (filter: PageFilter) => void;
  cyclePageSortMode: () => void;
  cycleNoteSortMode: () => void;
  addPage: (site: string, parentId?: string | null, content?: NoteContent, title?: string, source?: NoteSource) => Promise<PageNode>;
  addNote: (site: string, content: NoteContent, title?: string, source?: NoteSource) => Promise<PageNode>;
  updatePageContent: (id: string, content: NoteContent) => Promise<void>;
  updateNote: (site: string, id: string, content: NoteContent) => Promise<void>;
  updatePageTitle: (id: string, title: string) => Promise<void>;
  updateNoteTitle: (site: string, id: string, title: string) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  deleteNote: (site: string, id: string) => Promise<void>;
  togglePagePin: (id: string) => Promise<void>;
  toggleNotePin: (site: string, id: string) => Promise<void>;
  togglePageFavorite: (id: string) => Promise<void>;
  toggleNoteFavorite: (site: string, id: string) => Promise<void>;
  addPageTag: (id: string, tag: string) => Promise<void>;
  addNoteTag: (site: string, id: string, tag: string) => Promise<void>;
  removePageTag: (id: string, tag: string) => Promise<void>;
  removeNoteTag: (site: string, id: string, tag: string) => Promise<void>;
  togglePageCollapsed: (id: string) => Promise<void>;
  movePage: (id: string, parentId: string) => Promise<void>;
  deleteSite: (site: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  getPage: (id: string | null) => PageNode | null;
  getChildren: (parentId: string) => PageNode[];
  siteRoots: () => PageNode[];
  filteredSites: () => string[];
  visibleTreeRows: () => TreeRow[];
  filteredNotes: (site: string) => PageNode[];
  sortedNotes: (site: string) => PageNode[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  workspace: createEmptyWorkspace(),
  currentSite: null,
  selectedPageId: null,
  selectedNoteId: null,
  searchQuery: '',
  pageFilter: 'all',
  noteFilter: 'all',
  pageSortMode: 'updated',
  noteSortMode: 'updated',
  isLoading: false,
  error: null,

  loadWorkspace: async () => {
    set({ isLoading: true, error: null });
    try {
      const [workspace, meta] = await Promise.all([getWorkspace(), getMeta()]);
      const currentSelected = get().selectedPageId;
      const restoredSelected =
        (currentSelected && workspace.pages[currentSelected]?.id) ||
        (meta.lastSelectedPageId && workspace.pages[meta.lastSelectedPageId]?.id) ||
        null;
      const restoredPage = restoredSelected ? workspace.pages[restoredSelected] : null;
      set({
        workspace,
        currentSite: restoredPage?.site ?? get().currentSite,
        selectedPageId: restoredSelected,
        selectedNoteId: restoredSelected,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load workspace',
        isLoading: false,
      });
    }
  },

  loadNotes: async () => get().loadWorkspace(),

  setCurrentSite: (site) => {
    if (get().currentSite === site) return;
    set({ currentSite: site });
  },

  setSelectedPageId: (id) => {
    if (get().selectedPageId === id) return;
    set({ selectedPageId: id, selectedNoteId: id });
    void persistLastSelectedPageId(id);
  },

  setSelectedNoteId: (id) => get().setSelectedPageId(id),

  selectPage: (pageId) => {
    const page = get().workspace.pages[pageId];
    set({
      currentSite: page?.site ?? get().currentSite,
      selectedPageId: pageId,
      selectedNoteId: pageId,
    });
    void persistLastSelectedPageId(pageId);
  },

  selectNote: (_site, pageId) => get().selectPage(pageId),

  ensureSiteRoot: async (site) => {
    const root = await storageEnsureSiteRoot(site);
    set({ workspace: await getWorkspace(), currentSite: site });
    return root;
  },

  setPageFilter: (filter) => {
    set({ pageFilter: filter, noteFilter: filter });
  },

  setNoteFilter: (filter) => get().setPageFilter(filter),

  cyclePageSortMode: () => {
    const order: PageSortMode[] = ['updated', 'created', 'title'];
    const currentIndex = order.indexOf(get().pageSortMode);
    const next = order[(currentIndex + 1) % order.length];
    set({ pageSortMode: next, noteSortMode: next });
  },

  cycleNoteSortMode: () => get().cyclePageSortMode(),

  addPage: async (site, parentId = null, content = '', title, source) => {
    try {
      const page = await storageAddPage(site, parentId, content, title || generateTitle(), source);
      const workspace = await getWorkspace();
      set({
        workspace,
        currentSite: page.site,
        selectedPageId: page.id,
        selectedNoteId: page.id,
      });
      void persistLastSelectedPageId(page.id);
      return page;
    } catch (err) {
      handleStoreError(err, 'Failed to add page');
      throw err;
    }
  },

  addNote: async (site, content, title, source) => get().addPage(site, null, content, title, source),

  updatePageContent: async (id, content) => {
    try {
      await storageUpdatePageContent(id, content);
      set({ workspace: await getWorkspace() });
    } catch (err) {
      handleStoreError(err, 'Failed to update page');
      throw err;
    }
  },

  updateNote: async (_site, id, content) => get().updatePageContent(id, content),

  updatePageTitle: async (id, title) => {
    try {
      await storageUpdatePageTitle(id, title);
      set({ workspace: await getWorkspace() });
    } catch (err) {
      handleStoreError(err, 'Failed to update title');
      throw err;
    }
  },

  updateNoteTitle: async (_site, id, title) => get().updatePageTitle(id, title),

  deletePage: async (id) => {
    try {
      await storageDeletePage(id);
      const workspace = await getWorkspace();
      const nextSelected = getNextSelection(workspace, id);
      set({
        workspace,
        selectedPageId: nextSelected,
        selectedNoteId: nextSelected,
      });
      void persistLastSelectedPageId(nextSelected);
    } catch (err) {
      handleStoreError(err, 'Failed to delete page');
      throw err;
    }
  },

  deleteNote: async (_site, id) => get().deletePage(id),

  togglePagePin: async (id) => {
    const page = get().workspace.pages[id];
    if (!page) return;
    await storageUpdatePageMeta(id, { pinned: !page.pinned });
    set({ workspace: await getWorkspace() });
  },

  toggleNotePin: async (_site, id) => get().togglePagePin(id),

  togglePageFavorite: async (id) => {
    const page = get().workspace.pages[id];
    if (!page) return;
    await storageUpdatePageMeta(id, { favorite: !page.favorite });
    set({ workspace: await getWorkspace() });
  },

  toggleNoteFavorite: async (_site, id) => get().togglePageFavorite(id),

  addPageTag: async (id, tag) => {
    const page = get().workspace.pages[id];
    if (!page) return;
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) return;
    const tags = [...(page.tags || [])];
    if (tags.some((currentTag) => currentTag.toLowerCase() === normalizedTag.toLowerCase())) return;
    tags.push(normalizedTag);
    await storageUpdatePageMeta(id, { tags });
    set({ workspace: await getWorkspace() });
  },

  addNoteTag: async (_site, id, tag) => get().addPageTag(id, tag),

  removePageTag: async (id, tag) => {
    const page = get().workspace.pages[id];
    if (!page?.tags?.includes(tag)) return;
    await storageUpdatePageMeta(id, { tags: page.tags.filter((currentTag) => currentTag !== tag) });
    set({ workspace: await getWorkspace() });
  },

  removeNoteTag: async (_site, id, tag) => get().removePageTag(id, tag),

  togglePageCollapsed: async (id) => {
    const page = get().workspace.pages[id];
    if (!page) return;
    await storageUpdatePageMeta(id, { collapsed: !page.collapsed });
    set({ workspace: await getWorkspace() });
  },

  movePage: async (id, parentId) => {
    await storageMovePage(id, parentId);
    const workspace = await getWorkspace();
    const page = workspace.pages[id];
    set({
      workspace,
      currentSite: page?.site ?? get().currentSite,
      selectedPageId: page?.id ?? get().selectedPageId,
      selectedNoteId: page?.id ?? get().selectedNoteId,
    });
    void persistLastSelectedPageId(page?.id ?? get().selectedPageId);
  },

  deleteSite: async (site) => {
    await storageDeleteSite(site);
    const workspace = await getWorkspace();
    const nextSelected = getNextSelection(workspace, get().selectedPageId);
    set({
      workspace,
      currentSite: get().currentSite === site ? null : get().currentSite,
      selectedPageId: nextSelected,
      selectedNoteId: nextSelected,
    });
    void persistLastSelectedPageId(nextSelected);
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getPage: (id) => {
    if (!id) return null;
    return get().workspace.pages[id] ?? null;
  },

  getChildren: (parentId) => sortPages(getChildren(get().workspace, parentId), get().pageSortMode),

  siteRoots: () => {
    const { workspace } = get();
    return workspace.rootIds
      .map((id) => workspace.pages[id])
      .filter((page): page is PageNode => Boolean(page))
      .sort((a, b) => a.sortIndex - b.sortIndex || a.site.localeCompare(b.site));
  },

  filteredSites: () => get().siteRoots().map((page) => page.site),

  visibleTreeRows: () => buildVisibleTreeRows(get()),

  filteredNotes: (site) => {
    const rootId = siteRootId(site);
    const pages = flattenSubtree(get().workspace, rootId).filter((page) => page.type === 'page');
    return filterPages(pages, get().searchQuery, get().pageFilter);
  },

  sortedNotes: (site) => sortPages(get().filteredNotes(site), get().pageSortMode),
}));

function buildVisibleTreeRows(state: NotesState): TreeRow[] {
  const { workspace, searchQuery, pageFilter, pageSortMode } = state;
  const query = searchQuery.trim().toLowerCase();
  const rows: TreeRow[] = [];
  const matches = new Set<string>();
  const childrenByParent = buildChildrenIndex(workspace);

  if (query || pageFilter !== 'all') {
    for (const page of Object.values(workspace.pages)) {
      if (pageMatchesFilters(page, query, pageFilter)) {
        collectAncestors(workspace, page.id, matches);
      }
    }
  }

  const walk = (page: PageNode, depth: number) => {
    const children = sortPages(childrenByParent.get(page.id) ?? [], pageSortMode);
    const shouldShow = !query && pageFilter === 'all' ? true : matches.has(page.id);
    if (!shouldShow) return;

    rows.push({ page, depth, hasChildren: children.length > 0 });
    if (page.collapsed && !query && pageFilter === 'all') return;

    for (const child of children) {
      walk(child, depth + 1);
    }
  };

  const roots = state.siteRoots();
  for (const root of roots) {
    walk(root, 0);
  }
  return rows;
}

function getChildren(workspace: WorkspaceStore, parentId: string): PageNode[] {
  return Object.values(workspace.pages).filter((page) => page.parentId === parentId);
}

function buildChildrenIndex(workspace: WorkspaceStore): Map<string, PageNode[]> {
  const childrenByParent = new Map<string, PageNode[]>();
  for (const page of Object.values(workspace.pages)) {
    if (!page.parentId) continue;
    const siblings = childrenByParent.get(page.parentId) ?? [];
    siblings.push(page);
    childrenByParent.set(page.parentId, siblings);
  }
  return childrenByParent;
}

function flattenSubtree(workspace: WorkspaceStore, rootId: string): PageNode[] {
  const root = workspace.pages[rootId];
  if (!root) return [];
  const childrenByParent = buildChildrenIndex(workspace);
  const result: PageNode[] = [];
  const walk = (page: PageNode) => {
    result.push(page);
    for (const child of childrenByParent.get(page.id) ?? []) walk(child);
  };
  walk(root);
  return result;
}

function collectAncestors(workspace: WorkspaceStore, id: string, result: Set<string>) {
  let current: PageNode | undefined = workspace.pages[id];
  while (current) {
    result.add(current.id);
    current = current.parentId ? workspace.pages[current.parentId] : undefined;
  }
}

function filterPages(pages: PageNode[], searchQuery: string, filter: PageFilter): PageNode[] {
  const query = searchQuery.trim().toLowerCase();
  return pages.filter((page) => pageMatchesFilters(page, query, filter));
}

function pageMatchesFilters(page: PageNode, query: string, filter: PageFilter): boolean {
  if (filter === 'pinned' && !page.pinned) return false;
  if (filter === 'favorite' && !page.favorite) return false;
  if (filter === 'tagged' && (page.tags?.length || 0) === 0) return false;
  if (!query) return true;
  return pageMatchesQuery(page, query);
}

function sortPages(pages: PageNode[], sortMode: PageSortMode): PageNode[] {
  return [...pages].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    if (sortMode === 'created') return b.createdAt - a.createdAt;
    if (sortMode === 'title') return a.title.localeCompare(b.title);
    return a.sortIndex - b.sortIndex || b.updatedAt - a.updatedAt;
  });
}

function pageMatchesQuery(page: PageNode, query: string): boolean {
  if (page.title.toLowerCase().includes(query)) return true;
  if (page.site.toLowerCase().includes(query)) return true;
  if ((page.tags || []).some((tag) => tag.toLowerCase().includes(query))) return true;
  if (page.source && sourceMatchesQuery(page.source, query)) return true;
  return contentToMarkdown(page.content).toLowerCase().includes(query);
}

function sourceMatchesQuery(source: NoteSource, query: string): boolean {
  return [source.pageTitle, source.pageUrl, source.hostname].some((value) =>
    value?.toLowerCase().includes(query),
  );
}

function getNextSelection(workspace: WorkspaceStore, deletedId: string | null): string | null {
  if (deletedId && workspace.pages[deletedId]) return deletedId;
  return workspace.rootIds.find((id) => workspace.pages[id]) ?? Object.keys(workspace.pages)[0] ?? null;
}

function generateTitle() {
  const now = new Date();
  const date = `${now.getMonth() + 1}/${now.getDate()} ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return t('newPageTitle', { date });
}

function normalizeTag(tag: string): string {
  return tag.trim();
}

function handleStoreError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('QUOTA_BYTES')) {
    toast.error(t('storageQuotaExceeded'));
  } else {
    useNotesStore.setState({ error: message });
  }
}

async function persistLastSelectedPageId(pageId: string | null): Promise<void> {
  try {
    const meta = await getMeta();
    await setMeta({ ...meta, lastSelectedPageId: pageId });
  } catch {
    // Selection persistence is a convenience; editing should continue if it fails.
  }
}

onWorkspaceChange((workspace) => {
  useNotesStore.setState({ workspace });
});
