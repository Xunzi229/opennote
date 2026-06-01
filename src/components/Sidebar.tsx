import { useEffect, useRef, useState } from 'react';
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
  Pin,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportWorkspaceBackup,
  exportWorkspaceMarkdown,
  getWorkspaceStorageUsage,
  importWorkspaceBackup,
  siteRootId,
  type StorageUsage,
} from '../lib/storage';
import { normalizeSiteInput } from '../lib/siteInput';
import { getSiteFaviconUrl } from '../lib/favicon';
import type { PageFilter, PageNode } from '../types';
import PromptDialog from './PromptDialog';
import { t } from '../i18n';

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
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PageNode | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [addSiteInput, setAddSiteInput] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    void getWorkspaceStorageUsage()
      .then((usage) => {
        if (!cancelled) setStorageUsage(usage);
      })
      .catch(() => {
        if (!cancelled) setStorageUsage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace]);

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
      <aside className="panel panel-sidebar">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt={t('productNameEnglish')} className="logo-mark" />
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-semibold text-[var(--color-text)] leading-none">{t('productName')}</h1>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">{t('productSubtitle')}</p>
            </div>
            {actualCurrentSite && actualCurrentSite !== currentSite && (
              <button
                type="button"
                onClick={handleSelectCurrentSite}
                className="btn btn-ghost btn-icon"
                title={t('locateCurrentSite', { site: actualCurrentSite })}
              >
                <Globe2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="panel-section space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-center gap-2">
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
                className={`btn btn-secondary !w-[108px] justify-between !px-3 ${
                  isFilterMenuOpen ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(34,197,94,0.12)]' : ''
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
                <div
                  role="listbox"
                  className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-md)]"
                >
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
                        className={`flex h-8 w-full items-center rounded-[6px] px-3 text-left text-[13px] transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary-soft-text)]'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {shouldOfferCurrentSiteCreate && activeSite && (
            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-muted)] p-3">
              <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)] mb-2">
                <Globe2 className="w-3.5 h-3.5" />
                <span className="min-w-0 truncate">{t('currentSite', { site: activeSite })}</span>
              </div>
              <button
                type="button"
                onClick={handleCreateCurrentSitePage}
                className="btn btn-secondary w-full"
              >
                <Plus className="w-4 h-4" />
                {t('createPageInCurrentSite')}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {rows.length === 0 ? (
            <div className="empty-state">
              <p className="text-[13px]">{searchQuery ? t('noMatchedPages') : t('noPages')}</p>
            </div>
          ) : (
            rows.map(({ page, depth, hasChildren }) => {
              const isActive = selectedPageId === page.id;
              const canRename = page.type === 'page';
              const paddingLeft = 8 + depth * 16;
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
                    const canDrop = canDropOn(page);
                    setDraggedPageId(null);
                    if (!sourceId || !canDrop) return;
                    await movePage(sourceId, page.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPage(page.id);
                    }
                  }}
                  className={`group flex items-center gap-1.5 h-8 rounded-[8px] px-2 mb-0.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]'
                      : canDropOn(page)
                        ? 'bg-[var(--color-muted)] text-[var(--color-text)]'
                        : 'hover:bg-[var(--color-muted)] text-[var(--color-text)]'
                  }`}
                  style={{ paddingLeft }}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (hasChildren) void togglePageCollapsed(page.id);
                    }}
                    className="w-5 h-5 shrink-0 inline-flex items-center justify-center rounded hover:bg-white/70"
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
                    <img
                      src={getSiteFaviconUrl(page.site, 24)}
                      alt=""
                      className="w-4 h-4 rounded-[4px] object-contain shrink-0"
                    />
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
                      className="min-w-0 flex-1 bg-transparent border-b border-[var(--color-primary)] text-[13px] outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      onDoubleClick={(event) => handleStartEditTitle(page, event)}
                      className={`min-w-0 flex-1 truncate text-[13px] ${canRename ? 'cursor-text' : ''}`}
                      title={canRename ? t('renameByDoubleClick') : page.site}
                    >
                      {page.title}
                    </span>
                  )}

                  {page.pinned && (
                    <Pin
                      className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-hover)] fill-current"
                      aria-label={t('pinned')}
                    />
                  )}

                  <button
                    type="button"
                    onClick={(event) => handleCreateChildPage(page, event)}
                    className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-icon !w-6 !h-6 text-[var(--color-primary-hover)]"
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
                      className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-icon !w-6 !h-6 text-[var(--color-danger)]"
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
                      className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-icon !w-6 !h-6 text-[var(--color-danger)]"
                      title={t('deleteSite')}
                      aria-label={t('deleteSite')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="panel-footer">
          <div className="grid grid-cols-3 gap-2 mb-2">
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
          {usageText && (
            <div className="mb-2 text-[11px] text-[var(--color-text-secondary)] text-center">
              {t('localStorageUsed', { usage: usageText })}
            </div>
          )}
          <button onClick={handleOpenAddSite} className="btn btn-secondary w-full">
            <Plus className="w-4 h-4" />
            {t('addSite')}
          </button>
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
