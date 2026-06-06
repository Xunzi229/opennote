import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import ConfirmDialog from './ConfirmDialog';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Globe2,
  Languages,
  Pin,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportWorkspaceBackup,
  exportWorkspaceMarkdown,
  getMeta,
  getWorkspaceStorageUsage,
  importWorkspaceBackup,
  setMeta,
  siteRootId,
  type StorageUsage,
} from '../lib/storage';
import { normalizeSiteInput } from '../lib/siteInput';
import { getSiteFaviconUrl } from '../lib/favicon';
import type { PageFilter, PageNode } from '../types';
import PromptDialog from './PromptDialog';
import { t, useLocale, localeLabels, availableLocales } from '../i18n';

const TREE_ROW_HEIGHT = 34;
const TREE_OVERSCAN_ROWS = 8;
const TREE_FALLBACK_VIEWPORT_ROWS = 24;
const QUICK_SECTION_LIMIT = 4;

type QuickSectionPreferences = {
  showFavoritesSection: boolean;
  showPinnedSection: boolean;
  favoritesSectionCollapsed: boolean;
  pinnedSectionCollapsed: boolean;
};

const DEFAULT_QUICK_SECTION_PREFS: QuickSectionPreferences = {
  showFavoritesSection: true,
  showPinnedSection: true,
  favoritesSectionCollapsed: false,
  pinnedSectionCollapsed: false,
};

export default function Sidebar() {
  const {
    workspace,
    searchQuery,
    setSearchQuery,
    selectedPageId,
    pageFilter,
    pageSortMode,
    setPageFilter,
    cyclePageSortMode,
    addPage,
    updatePageTitle,
    deletePage,
    deleteSite,
    movePage,
    togglePageCollapsed,
    selectPage,
    visibleTreeRows,
    ensureSiteRoot,
    currentSite,
    loadWorkspace,
  } = useNotesStore();

  const actualCurrentSite = useActiveSite();
  const activeSite = currentSite ?? actualCurrentSite;
  const activeSiteRoot = activeSite ? workspace.pages[siteRootId(activeSite)] : undefined;
  const shouldOfferCurrentSiteCreate = Boolean(activeSite && !activeSiteRoot);
  const rows = visibleTreeRows();
  const selectedRowIndex = rows.findIndex(({ page }) => page.id === selectedPageId);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [currentLocale, setLocale] = useLocale();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PageNode | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [addSiteInput, setAddSiteInput] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSectionPrefs, setQuickSectionPrefs] = useState<QuickSectionPreferences>(DEFAULT_QUICK_SECTION_PREFS);
  const [treeScrollTop, setTreeScrollTop] = useState(0);
  const [treeViewportHeight, setTreeViewportHeight] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const quickSettingsMenuRef = useRef<HTMLDivElement>(null);
  const quickSectionPrefsRef = useRef<QuickSectionPreferences>(DEFAULT_QUICK_SECTION_PREFS);
  const quickSectionPrefsChangedRef = useRef(false);
  const treeScrollRef = useRef<HTMLDivElement>(null);

  const treeViewportRows = Math.ceil(
    (treeViewportHeight || TREE_ROW_HEIGHT * TREE_FALLBACK_VIEWPORT_ROWS) / TREE_ROW_HEIGHT,
  );
  const treeStartIndex = Math.max(0, Math.floor(treeScrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN_ROWS);
  const treeEndIndex = Math.min(rows.length, treeStartIndex + treeViewportRows + TREE_OVERSCAN_ROWS * 2);
  const visibleRows = rows.slice(treeStartIndex, treeEndIndex);
  const topSpacerHeight = treeStartIndex * TREE_ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, rows.length - treeEndIndex) * TREE_ROW_HEIGHT;
  const allPages = Object.values(workspace.pages);
  const notePages = allPages.filter((page) => page.type === 'page');
  const favoritePages = notePages
    .filter((page) => page.favorite)
    .sort(sortQuickPages)
    .slice(0, QUICK_SECTION_LIMIT);
  const pinnedPages = allPages
    .filter((page) => page.pinned)
    .sort(sortQuickPages)
    .slice(0, QUICK_SECTION_LIMIT);
  const siteCount = workspace.rootIds.length;
  const pageCount = notePages.length;

  useLayoutEffect(() => {
    const element = treeScrollRef.current;
    if (!element) return;

    const updateViewportHeight = () => {
      setTreeViewportHeight(element.clientHeight);
    };

    updateViewportHeight();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = treeScrollRef.current;
    if (!element || !selectedPageId) return;
    if (selectedRowIndex < 0) return;

    const viewportHeight = element.clientHeight || TREE_ROW_HEIGHT * TREE_FALLBACK_VIEWPORT_ROWS;
    const rowTop = selectedRowIndex * TREE_ROW_HEIGHT;
    const rowBottom = rowTop + TREE_ROW_HEIGHT;
    const currentTop = element.scrollTop;
    const currentBottom = currentTop + viewportHeight;

    if (rowTop >= currentTop && rowBottom <= currentBottom) return;

    const nextTop = Math.max(0, rowTop - TREE_ROW_HEIGHT * 2);
    element.scrollTop = nextTop;
    setTreeScrollTop(nextTop);
  }, [selectedRowIndex, selectedPageId]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void getWorkspaceStorageUsage()
        .then((usage) => {
          if (!cancelled) setStorageUsage(usage);
        })
        .catch(() => {
          if (!cancelled) setStorageUsage(null);
        });
    }, 750);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [workspace]);

  useEffect(() => {
    let cancelled = false;

    void getMeta()
      .then((meta) => {
        if (cancelled || quickSectionPrefsChangedRef.current) return;
        const nextPrefs = {
          showFavoritesSection: meta.showFavoritesSection ?? DEFAULT_QUICK_SECTION_PREFS.showFavoritesSection,
          showPinnedSection: meta.showPinnedSection ?? DEFAULT_QUICK_SECTION_PREFS.showPinnedSection,
          favoritesSectionCollapsed:
            meta.favoritesSectionCollapsed ?? DEFAULT_QUICK_SECTION_PREFS.favoritesSectionCollapsed,
          pinnedSectionCollapsed: meta.pinnedSectionCollapsed ?? DEFAULT_QUICK_SECTION_PREFS.pinnedSectionCollapsed,
        };
        quickSectionPrefsRef.current = nextPrefs;
        setQuickSectionPrefs(nextPrefs);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFilterMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isFilterMenuOpen]);

  useEffect(() => {
    if (!isLangMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!langMenuRef.current?.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isLangMenuOpen]);

  useEffect(() => {
    if (!isQuickSettingsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!quickSettingsMenuRef.current?.contains(event.target as Node)) {
        setIsQuickSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isQuickSettingsOpen]);

  const updateQuickSectionPrefs = (changes: Partial<QuickSectionPreferences>) => {
    const nextPrefs = { ...quickSectionPrefsRef.current, ...changes };
    quickSectionPrefsChangedRef.current = true;
    quickSectionPrefsRef.current = nextPrefs;
    setQuickSectionPrefs(nextPrefs);
    void getMeta()
      .then((meta) => setMeta({ ...meta, ...quickSectionPrefsRef.current }))
      .catch(() => undefined);
  };

  const toggleFavoritesCollapsed = () => {
    updateQuickSectionPrefs({
      favoritesSectionCollapsed: !quickSectionPrefs.favoritesSectionCollapsed,
    });
  };

  const togglePinnedCollapsed = () => {
    updateQuickSectionPrefs({
      pinnedSectionCollapsed: !quickSectionPrefs.pinnedSectionCollapsed,
    });
  };

  const toggleFavoritesVisibility = () => {
    updateQuickSectionPrefs({
      showFavoritesSection: !quickSectionPrefs.showFavoritesSection,
    });
  };

  const togglePinnedVisibility = () => {
    updateQuickSectionPrefs({
      showPinnedSection: !quickSectionPrefs.showPinnedSection,
    });
  };

  const handleCreateCurrentSitePage = async () => {
    if (!activeSite) return;
    const root = await ensureSiteRoot(activeSite);
    await addPage(activeSite, root.id);
  };

  const handleCreateChildPage = async (parent: PageNode, event: React.MouseEvent) => {
    event.stopPropagation();
    await addPage(parent.site, parent.id);
  };

  const handleOpenAddSite = () => {
    setAddSiteInput('');
    setShowAddSiteDialog(true);
  };

  const handleConfirmAddSite = async () => {
    const hostname = normalizeSiteInput(addSiteInput);
    if (!hostname) {
      toast.error(t('invalidSite'));
      return;
    }
    const root = await ensureSiteRoot(hostname);
    selectPage(root.id);
    setShowAddSiteDialog(false);
    setAddSiteInput('');
  };

  const handleSelectCurrentSite = async () => {
    if (!actualCurrentSite) return;
    const root = await ensureSiteRoot(actualCurrentSite);
    selectPage(root.id);
  };

  const handleStartEditTitle = (page: PageNode, event: React.MouseEvent) => {
    event.stopPropagation();
    if (page.type === 'site') return;
    setEditingTitleId(page.id);
    setEditingTitleValue(page.title);
  };

  const handleSaveTitle = async (pageId: string) => {
    if (!editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }

    try {
      await updatePageTitle(pageId, editingTitleValue.trim());
      setEditingTitleId(null);
    } catch {
      toast.error('更新标题失败');
    }
  };

  const canDropOn = (target: PageNode) => {
    if (!draggedPageId || draggedPageId === target.id) return false;
    const dragged = useNotesStore.getState().getPage(draggedPageId);
    if (!dragged || dragged.type === 'site') return false;

    let current: PageNode | null = target;
    while (current) {
      if (current.id === dragged.id) return false;
      current = current.parentId ? useNotesStore.getState().getPage(current.parentId) : null;
    }
    return true;
  };

  const handleExportWorkspace = async () => {
    try {
      const json = await exportWorkspaceBackup();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(json, `opennote-workspace-${date}.json`, 'application/json');
      toast.success(t('workspaceExported'));
    } catch {
      toast.error(t('exportFailed'));
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const markdown = await exportWorkspaceMarkdown();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(markdown, `opennote-workspace-${date}.md`, 'text/markdown');
      toast.success(t('markdownExported'));
    } catch {
      toast.error(t('markdownExportFailed'));
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(t('importConfirm'));
    if (!confirmed) return;

    try {
      await importWorkspaceBackup(await file.text());
      await loadWorkspace();
      toast.success(t('workspaceImported'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('importFailed'));
    }
  };

  const filters: { id: PageFilter; label: string }[] = [
    { id: 'all', label: t('filterAll') },
    { id: 'pinned', label: t('filterPinned') },
    { id: 'favorite', label: t('filterFavorite') },
    { id: 'tagged', label: t('filterTagged') },
  ];
  const sortLabelByMode = {
    updated: t('sortUpdated'),
    created: t('sortCreated'),
    title: t('sortTitle'),
  } satisfies Record<typeof pageSortMode, string>;
  const usageText = storageUsage ? formatStorageUsage(storageUsage) : null;

  return (
    <>
      <aside className="panel panel-sidebar workspace-sidebar">
        <div className="workspace-brand">
          <div className="brand-mark-wrap">
            <img src="/logo.png" alt={t('productNameEnglish')} className="logo-mark" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="workspace-title">{t('productName')}</h1>
            <p className="workspace-subtitle">
              {t('workspaceStats', { sites: siteCount, pages: pageCount })}
            </p>
          </div>
          {actualCurrentSite && actualCurrentSite !== currentSite && (
            <button
              type="button"
              onClick={handleSelectCurrentSite}
              className="btn btn-ghost btn-icon"
              title={t('locateCurrentSite', { site: actualCurrentSite })}
              aria-label={t('locateCurrentSite', { site: actualCurrentSite })}
            >
              <Globe2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="workspace-command" data-testid="sidebar-search-command">
          <Search className="command-search-icon" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="input-field command-input"
          />
        </div>

        <div className="workspace-controls">
          <button
            type="button"
            onClick={cyclePageSortMode}
            className="btn btn-secondary flex-1"
            title={t('sortToggle')}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortLabelByMode[pageSortMode]}
          </button>
          <div ref={filterMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsFilterMenuOpen(false);
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setIsFilterMenuOpen(true);
                }
              }}
              className={`btn btn-secondary sidebar-filter-button ${
                isFilterMenuOpen ? 'is-open' : ''
              }`}
              aria-haspopup="listbox"
              aria-expanded={isFilterMenuOpen}
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-secondary)]" />
                <span className="truncate">{filters.find((filter) => filter.id === pageFilter)?.label}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--color-text-secondary)] transition-transform ${
                isFilterMenuOpen ? 'rotate-180' : ''
              }`} />
            </button>
            {isFilterMenuOpen && (
              <div role="listbox" className="floating-menu sidebar-filter-menu">
                {filters.map((filter) => {
                  const isSelected = filter.id === pageFilter;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setPageFilter(filter.id);
                        setIsFilterMenuOpen(false);
                      }}
                      className={`floating-menu-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <section className="sidebar-section" data-testid="sidebar-current-site">
          <div className="section-heading">
            <span>{t('currentSiteSection')}</span>
            {activeSite && <span className="section-count">{t('activeStatus')}</span>}
          </div>
          {activeSite ? (
            <div className="current-site-card">
              <img src={getSiteFaviconUrl(activeSite, 24)} alt="" className="site-favicon" />
              <div className="min-w-0 flex-1">
                <div className="current-site-name">{activeSite}</div>
                <div className="current-site-meta">
                  {activeSiteRoot ? t('siteReadyForNotes') : t('siteNoWorkspaceYet')}
                </div>
              </div>
              {shouldOfferCurrentSiteCreate ? (
                <button type="button" onClick={handleCreateCurrentSitePage} className="btn btn-primary compact-action">
                  <Plus className="w-4 h-4" />
                  {t('createPageInCurrentSite')}
                </button>
              ) : (
                activeSiteRoot && (
                  <button
                    type="button"
                    onClick={() => selectPage(activeSiteRoot.id)}
                    className="btn btn-ghost btn-icon"
                    title={t('locateCurrentSite', { site: activeSite })}
                    aria-label={t('locateCurrentSite', { site: activeSite })}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="section-empty">{t('emptyCurrentSiteHint')}</div>
          )}
        </section>

        {quickSectionPrefs.showFavoritesSection && (
          <section
            className={`sidebar-section quick-section ${
              quickSectionPrefs.favoritesSectionCollapsed ? 'is-collapsed' : ''
            }`}
            data-testid="sidebar-favorites-section"
          >
            <button
              type="button"
              className="section-heading quick-section-heading"
              onClick={toggleFavoritesCollapsed}
              aria-expanded={!quickSectionPrefs.favoritesSectionCollapsed}
              aria-label={t(quickSectionPrefs.favoritesSectionCollapsed ? 'expandSection' : 'collapseSection', {
                section: t('favoritesSection'),
              })}
              data-testid="sidebar-favorites-toggle"
            >
              <span className="quick-section-label">
                {quickSectionPrefs.favoritesSectionCollapsed ? (
                  <ChevronRight className="quick-section-chevron" />
                ) : (
                  <ChevronDown className="quick-section-chevron" />
                )}
                <span>{t('favoritesSection')}</span>
              </span>
              <span className="section-count">{favoritePages.length}</span>
            </button>
            {!quickSectionPrefs.favoritesSectionCollapsed &&
              (favoritePages.length > 0 ? (
                <div className="quick-list">
                  {favoritePages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => selectPage(page.id)}
                      className={`quick-row ${selectedPageId === page.id ? 'is-active' : ''}`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span className="quick-row-title">{page.title}</span>
                      <PageUpdatedAt page={page} testId={`favorite-page-updated-at-${page.id}`} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="section-empty">{t('emptyFavoritesHint')}</div>
              ))}
          </section>
        )}

        {quickSectionPrefs.showPinnedSection && (
          <section
            className={`sidebar-section quick-section ${
              quickSectionPrefs.pinnedSectionCollapsed ? 'is-collapsed' : ''
            }`}
            data-testid="sidebar-pinned-section"
          >
            <button
              type="button"
              className="section-heading quick-section-heading"
              onClick={togglePinnedCollapsed}
              aria-expanded={!quickSectionPrefs.pinnedSectionCollapsed}
              aria-label={t(quickSectionPrefs.pinnedSectionCollapsed ? 'expandSection' : 'collapseSection', {
                section: t('pinnedSection'),
              })}
              data-testid="sidebar-pinned-toggle"
            >
              <span className="quick-section-label">
                {quickSectionPrefs.pinnedSectionCollapsed ? (
                  <ChevronRight className="quick-section-chevron" />
                ) : (
                  <ChevronDown className="quick-section-chevron" />
                )}
                <span>{t('pinnedSection')}</span>
              </span>
              <span className="section-count">{pinnedPages.length}</span>
            </button>
            {!quickSectionPrefs.pinnedSectionCollapsed &&
              (pinnedPages.length > 0 ? (
                <div className="quick-list">
                  {pinnedPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => selectPage(page.id)}
                      className={`quick-row ${selectedPageId === page.id ? 'is-active' : ''}`}
                    >
                      <Pin className="w-3.5 h-3.5 fill-current text-[var(--color-primary-hover)]" />
                      <span className="quick-row-title">{page.title}</span>
                      {page.type === 'page' && (
                        <PageUpdatedAt page={page} testId={`pinned-page-updated-at-${page.id}`} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="section-empty">{t('emptyPinnedHint')}</div>
              ))}
          </section>
        )}

        <section className="sidebar-tree-section" data-testid="sidebar-all-sites-section">
          <div className="section-heading px-2">
            <span>{t('allSitesSection')}</span>
            <span className="section-count">{rows.length}</span>
          </div>
          <div
            ref={treeScrollRef}
            data-testid="workspace-tree"
            className="workspace-tree-scroll"
            onScroll={(event) => setTreeScrollTop(event.currentTarget.scrollTop)}
          >
            {rows.length === 0 ? (
              <div className="empty-state">
                <p className="text-[13px]">{searchQuery ? t('noMatchedPages') : t('noPages')}</p>
              </div>
            ) : (
              <>
                {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} aria-hidden="true" />}
                {visibleRows.map(({ page, depth, hasChildren }) => {
                  const isActive = selectedPageId === page.id;
                  const canRename = page.type === 'page';
                  const paddingLeft = 8 + depth * 16;
                  const canDrop = canDropOn(page);
                  return (
                    <div
                      key={page.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectPage(page.id)}
                      draggable={page.type === 'page'}
                      onDragStart={(event) => {
                        if (page.type === 'site') return;
                        setDraggedPageId(page.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', page.id);
                      }}
                      onDragEnd={() => setDraggedPageId(null)}
                      onDragOver={(event) => {
                        if (!canDropOn(page)) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={async (event) => {
                        event.preventDefault();
                        const sourceId = draggedPageId ?? event.dataTransfer.getData('text/plain');
                        const targetCanDrop = canDropOn(page);
                        setDraggedPageId(null);
                        if (!sourceId || !targetCanDrop) return;
                        await movePage(sourceId, page.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectPage(page.id);
                        }
                      }}
                      className={`tree-row ${isActive ? 'is-active' : ''} ${canDrop ? 'is-drop-target' : ''}`}
                      style={{ paddingLeft }}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (hasChildren) void togglePageCollapsed(page.id);
                        }}
                        className="tree-disclosure"
                        aria-label={page.collapsed ? t('expand') : t('collapse')}
                      >
                        {hasChildren ? (
                          page.collapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <span className="w-3.5" />
                        )}
                      </button>

                      {page.type === 'site' ? (
                        <img src={getSiteFaviconUrl(page.site, 24)} alt="" className="site-favicon" />
                      ) : (
                        <FileText className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)]" />
                      )}

                      {editingTitleId === page.id ? (
                        <input
                          value={editingTitleValue}
                          onChange={(event) => setEditingTitleValue(event.target.value)}
                          onBlur={() => handleSaveTitle(page.id)}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === 'Enter') void handleSaveTitle(page.id);
                            if (event.key === 'Escape') setEditingTitleId(null);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="tree-title-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          onDoubleClick={(event) => handleStartEditTitle(page, event)}
                          className={`tree-title ${canRename ? 'cursor-text' : ''}`}
                          title={canRename ? t('renameByDoubleClick') : page.site}
                        >
                          {page.title}
                        </span>
                      )}

                      {page.type === 'page' && editingTitleId !== page.id && (
                        <PageUpdatedAt page={page} testId={`tree-page-updated-at-${page.id}`} />
                      )}

                      {page.pinned && (
                        <Pin className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-hover)] fill-current" aria-label={t('pinned')} />
                      )}

                      <button
                        type="button"
                        onClick={(event) => handleCreateChildPage(page, event)}
                        className="tree-action btn btn-ghost btn-icon"
                        title={t('createPageUnder')}
                        aria-label={t('createPageUnderLabel', { title: page.title })}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {page.type === 'page' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteTarget(page);
                          }}
                          className="tree-action btn btn-ghost btn-icon text-[var(--color-danger)]"
                          title={t('deletePage')}
                          aria-label={t('deletePage')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {page.type === 'site' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSiteToDelete(page.site);
                          }}
                          className="tree-action btn btn-ghost btn-icon text-[var(--color-danger)]"
                          title={t('deleteSite')}
                          aria-label={t('deleteSite')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />}
              </>
            )}
          </div>
        </section>

        <div className="panel-footer workspace-footer" data-testid="sidebar-utility-footer">
          <div className="footer-primary-row">
            <button onClick={handleOpenAddSite} className="btn btn-secondary flex-1">
              <Plus className="w-4 h-4" />
              {t('addSite')}
            </button>
            <div className="relative" ref={quickSettingsMenuRef}>
              <button
                type="button"
                onClick={() => setIsQuickSettingsOpen((open) => !open)}
                className={`btn btn-secondary btn-icon w-[34px] h-[34px] ${
                  isQuickSettingsOpen ? 'is-selected' : ''
                }`}
                title={t('quickSectionsSettings')}
                aria-label={t('quickSectionsSettings')}
                aria-haspopup="menu"
                aria-expanded={isQuickSettingsOpen}
                data-testid="quick-sections-settings-button"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {isQuickSettingsOpen && (
                <div
                  role="menu"
                  className="floating-menu quick-settings-menu"
                  data-testid="quick-sections-settings-menu"
                >
                  <div className="quick-settings-title">{t('quickSectionsSettings')}</div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quickSectionPrefs.showFavoritesSection}
                    onClick={toggleFavoritesVisibility}
                    className="quick-settings-switch-row"
                    data-testid="toggle-favorites-section-visibility"
                  >
                    <span className="quick-settings-row-label">
                      <Star className="quick-settings-row-icon" />
                      <span>{t('showFavoritesSection')}</span>
                    </span>
                    <span
                      className={`quick-settings-switch ${
                        quickSectionPrefs.showFavoritesSection ? 'is-on' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <span className="quick-settings-switch-knob" />
                    </span>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={quickSectionPrefs.showPinnedSection}
                    onClick={togglePinnedVisibility}
                    className="quick-settings-switch-row"
                    data-testid="toggle-pinned-section-visibility"
                  >
                    <span className="quick-settings-row-label">
                      <Pin className="quick-settings-row-icon" />
                      <span>{t('showPinnedSection')}</span>
                    </span>
                    <span
                      className={`quick-settings-switch ${
                        quickSectionPrefs.showPinnedSection ? 'is-on' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <span className="quick-settings-switch-knob" />
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen((open) => !open)}
                className="btn btn-secondary btn-icon w-[34px] h-[34px]"
                title={t('language')}
                aria-label={t('language')}
              >
                <Languages className="w-4 h-4" />
              </button>
              {isLangMenuOpen && (
                <div role="listbox" className="floating-menu language-menu">
                  {availableLocales.map((locale) => {
                    const isSelected = currentLocale === locale;
                    return (
                      <button
                        key={locale}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setLocale(locale);
                          setIsLangMenuOpen(false);
                        }}
                        className={`floating-menu-item ${isSelected ? 'is-selected' : ''}`}
                      >
                        {localeLabels[locale]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="footer-data-grid">
            <button onClick={handleExportWorkspace} className="btn btn-secondary w-full !px-2" title={t('exportJsonBackup')}>
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button onClick={handleExportMarkdown} className="btn btn-secondary w-full !px-2" title={t('exportMarkdown')}>
              <FileText className="w-4 h-4" />
              MD
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="btn btn-secondary w-full !px-2"
              title={t('importJsonBackup')}
            >
              <Upload className="w-4 h-4" />
              {t('import')}
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          {usageText && <div className="storage-usage">{t('localStorageUsed', { usage: usageText })}</div>}
        </div>
      </aside>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={t('deletePage')}
        message={t('confirmDeletePage', { title: deleteTarget?.title ?? t('thisPage') })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deletePage(deleteTarget.id);
          setDeleteTarget(null);
          toast.success(t('pageDeleted'));
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(siteToDelete)}
        title={t('deleteSite')}
        message={t('confirmDeleteSite', { site: siteToDelete ?? '' })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        danger
        onConfirm={async () => {
          if (!siteToDelete) return;
          await deleteSite(siteToDelete);
          setSiteToDelete(null);
        }}
        onCancel={() => setSiteToDelete(null)}
      />

      <PromptDialog
        isOpen={showAddSiteDialog}
        title={t('addSite')}
        label={t('siteDomainOrUrl')}
        placeholder={t('sitePlaceholder')}
        value={addSiteInput}
        confirmText={t('add')}
        cancelText={t('cancel')}
        onChange={setAddSiteInput}
        onConfirm={handleConfirmAddSite}
        onCancel={() => {
          setShowAddSiteDialog(false);
          setAddSiteInput('');
        }}
      />
    </>
  );
}

function sortQuickPages(a: PageNode, b: PageNode): number {
  return b.updatedAt - a.updatedAt || a.title.localeCompare(b.title);
}

function PageUpdatedAt({ page, testId }: { page: PageNode; testId: string }) {
  const updatedAt = formatPageUpdatedAt(page.updatedAt);
  const label = t('pageLastUpdated', { time: updatedAt });
  return (
    <span className="page-updated-at" title={label} aria-label={label} data-testid={testId}>
      {updatedAt}
    </span>
  );
}

function formatPageUpdatedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatStorageUsage(usage: StorageUsage): string {
  const used = formatBytes(usage.bytesInUse);
  if (!usage.quotaBytes) return used;
  return `${used} / ${formatBytes(usage.quotaBytes)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
