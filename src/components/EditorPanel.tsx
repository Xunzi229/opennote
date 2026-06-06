import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import MarkdownEditor from './MarkdownEditor';
import { contentToMarkdown } from '../lib/markdownContent';
import { getNoteStats, formatRelativeTime } from '../lib/noteStats';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  CopyPlus,
  ExternalLink,
  FilePlus2,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Pin,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PromptDialog from './PromptDialog';
import { t } from '../i18n';

export default function EditorPanel() {
  const {
    selectedPageId,
    setSelectedPageId,
    getPage,
    addPage,
    updatePageContent,
    updatePageTitle,
    deletePage,
    togglePagePin,
    togglePageFavorite,
    addPageTag,
    removePageTag,
    ensureSiteRoot,
  } = useNotesStore();

  const activeSite = useActiveSite();
  const selectedPage = getPage(selectedPageId);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [draftContent, setDraftContent] = useState<{ pageId: string | null; content: string }>({
    pageId: null,
    content: '',
  });
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [moreMenuPageId, setMoreMenuPageId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const debouncedSave = (id: string, content: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updatePageContent(id, content);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
        toast.error(t('saveFailed'));
      }
    }, 1200);
  };

  const handleEditorUpdate = (content: string) => {
    setDraftContent({ pageId: selectedPage?.id ?? null, content });
    if (selectedPage) {
      debouncedSave(selectedPage.id, content);
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage || selectedPage.type === 'site') return;
    await deletePage(selectedPage.id);
    setMoreMenuPageId(null);
    toast.success(t('pageDeleted'));
  };

  const handleAddTag = () => {
    if (!selectedPage) return;
    setTagInput('');
    setShowTagDialog(true);
  };

  const handleConfirmTag = async () => {
    if (!selectedPage) return;
    const tag = tagInput.trim();
    if (!tag) return;

    await addPageTag(selectedPage.id, tag);
    setShowTagDialog(false);
    setTagInput('');
    toast.success(t('tagAdded'));
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedPage) return;
    await removePageTag(selectedPage.id, tag);
    toast.success(t('tagRemoved'));
  };

  const handleCreateFirstPage = async () => {
    if (!activeSite) {
      toast.error(t('openPageOrAddSite'));
      return;
    }
    const root = await ensureSiteRoot(activeSite);
    const page = await addPage(activeSite, root.id);
    setSelectedPageId(page.id);
  };

  const handleCreateChildPage = async () => {
    if (!selectedPage) return;
    const page = await addPage(selectedPage.site, selectedPage.id);
    setSelectedPageId(page.id);
    setMoreMenuPageId(null);
  };

  const handleDuplicatePage = async () => {
    if (!selectedPage || selectedPage.type === 'site') return;
    const page = await addPage(
      selectedPage.site,
      selectedPage.parentId,
      selectedPage.content,
      `${selectedPage.title} 副本`,
    );
    setSelectedPageId(page.id);
    setMoreMenuPageId(null);
    toast.success(t('pageCopied'));
  };

  const handleCopyText = async (text: string, message: string) => {
    if (!navigator.clipboard?.writeText) {
      toast.error(t('copyUnsupported'));
      return;
    }

    await navigator.clipboard.writeText(text);
    setMoreMenuPageId(null);
    toast.success(message);
  };

  const handleOpenSource = () => {
    if (!selectedPage?.source?.pageUrl) return;
    window.open(selectedPage.source.pageUrl, '_blank', 'noopener,noreferrer');
    setMoreMenuPageId(null);
  };

  if (!selectedPage) {
    return (
      <main className="panel panel-editor editor-panel">
        <div className="empty-state h-full flex flex-col items-center justify-center">
          <FileText className="empty-state-icon" />
          <p className="text-[14px] font-medium text-[var(--color-text)]">{t('selectOrCreatePage')}</p>
          <button onClick={handleCreateFirstPage} className="btn btn-primary mt-4">
            {t('newPage')}
          </button>
        </div>
      </main>
    );
  }

  const statsContent =
    draftContent.pageId === selectedPage.id
      ? draftContent.content
      : contentToMarkdown(selectedPage.content);
  const stats = getNoteStats(statsContent);
  const isMoreMenuOpen = moreMenuPageId === selectedPage.id;
  const sourceTitle = selectedPage.source?.pageTitle || selectedPage.source?.hostname || selectedPage.site;

  return (
    <main className="panel panel-editor editor-panel">
      <header className="editor-page-header">
        <div className="editor-breadcrumb" data-testid="editor-breadcrumb">
          <span className="breadcrumb-site">{selectedPage.site}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-page">{sourceTitle}</span>
          {selectedPage.source?.pageUrl && (
            <a
              href={selectedPage.source.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="breadcrumb-source-link"
              title={selectedPage.source.pageUrl}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="editor-title-row">
          <PageTitleInput key={selectedPage.id} page={selectedPage} onRename={updatePageTitle} />

          <div className="editor-action-cluster" data-testid="editor-action-cluster">
            <button
              onClick={() => togglePagePin(selectedPage.id)}
              className={`btn btn-ghost btn-icon ${selectedPage.pinned ? 'is-selected text-[var(--color-primary-hover)]' : ''}`}
              title={selectedPage.pinned ? t('unpin') : t('pin')}
              aria-label={selectedPage.pinned ? t('unpin') : t('pin')}
              aria-pressed={Boolean(selectedPage.pinned)}
            >
              <Pin className={`w-4 h-4 ${selectedPage.pinned ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => togglePageFavorite(selectedPage.id)}
              className={`btn btn-ghost btn-icon ${selectedPage.favorite ? 'text-amber-500 is-selected' : ''}`}
              title={t('favorite')}
            >
              <Star className={`w-4 h-4 ${selectedPage.favorite ? 'fill-amber-500' : ''}`} />
            </button>
            <button onClick={handleAddTag} className="btn btn-ghost btn-icon" title={t('addTag')}>
              <Tag className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuPageId(isMoreMenuOpen ? null : selectedPage.id)}
                className={`btn btn-ghost btn-icon ${isMoreMenuOpen ? 'is-selected' : ''}`}
                title={t('moreActions')}
                aria-label={t('moreActions')}
                aria-haspopup="menu"
                aria-expanded={isMoreMenuOpen}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {isMoreMenuOpen && (
                <div role="menu" className="floating-menu editor-more-menu">
                  <button type="button" role="menuitem" onClick={handleCreateChildPage} className="floating-menu-item with-icon">
                    <FilePlus2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('newChildPage')}
                  </button>
                  {selectedPage.type === 'page' && (
                    <button type="button" role="menuitem" onClick={handleDuplicatePage} className="floating-menu-item with-icon">
                      <CopyPlus className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t('copyPage')}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleCopyText(contentToMarkdown(selectedPage.content), t('markdownCopied'))}
                    className="floating-menu-item with-icon"
                  >
                    <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('copyMarkdown')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleCopyText(selectedPage.title, t('titleCopied'))}
                    className="floating-menu-item with-icon"
                  >
                    <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('copyTitle')}
                  </button>
                  {selectedPage.source?.pageUrl && (
                    <button type="button" role="menuitem" onClick={handleOpenSource} className="floating-menu-item with-icon">
                      <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t('openSource')}
                    </button>
                  )}
                  {selectedPage.type === 'page' && (
                    <button type="button" role="menuitem" onClick={handleDeletePage} className="floating-menu-item with-icon is-danger">
                      <Trash2 className="w-4 h-4" />
                      {t('deletePage')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-meta-row">
          <div className="tag-row">
            {(selectedPage.tags || []).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="tag gap-1 hover:text-[var(--color-danger)]"
                title={t('removeTag', { tag })}
                aria-label={t('removeTag', { tag })}
              >
                <span>{tag}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
            {(selectedPage.tags || []).length === 0 && <span className="meta-placeholder">{t('noTagsYet')}</span>}
          </div>
          <SaveStatusPill status={saveStatus} />
        </div>
      </header>

      <section className="editor-writing-surface" data-testid="editor-writing-surface">
        <MarkdownEditor
          key={selectedPage.id}
          noteId={selectedPage.id}
          content={selectedPage.content}
          onUpdate={handleEditorUpdate}
        />
      </section>

      <footer className="editor-status-footer" data-testid="editor-status-footer">
        <div className="min-w-0 flex items-center gap-3">
          <span className="shrink-0">{t('lastEdited', { time: formatRelativeTime(selectedPage.updatedAt) })}</span>
          {selectedPage.source?.pageUrl && (
            <a
              href={selectedPage.source.pageUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 inline-flex items-center gap-1 hover:text-[var(--color-primary-hover)]"
              title={selectedPage.source.pageTitle || selectedPage.source.pageUrl}
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{selectedPage.source.pageTitle || selectedPage.source.hostname}</span>
            </a>
          )}
        </div>
        <span>{t('charsLines', { chars: stats.chars, lines: stats.lines })}</span>
      </footer>

      <PromptDialog
        isOpen={showTagDialog}
        title={t('addTag')}
        label={t('tagName')}
        placeholder={t('tagPlaceholder')}
        value={tagInput}
        onChange={setTagInput}
        onConfirm={handleConfirmTag}
        onCancel={() => {
          setShowTagDialog(false);
          setTagInput('');
        }}
      />
    </main>
  );
}

function SaveStatusPill({ status }: { status: 'saved' | 'saving' | 'error' }) {
  if (status === 'saving') {
    return (
      <span className="save-status-pill is-saving">
        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
        {t('saving')}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="save-status-pill is-error">
        <AlertCircle className="w-3.5 h-3.5" />
        {t('saveFailed')}
      </span>
    );
  }

  return (
    <span className="save-status-pill is-saved">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {t('saved')}
    </span>
  );
}

function PageTitleInput({
  page,
  onRename,
}: {
  page: { id: string; title: string; type: 'site' | 'page' };
  onRename: (id: string, title: string) => Promise<void>;
}) {
  const [draftTitle, setDraftTitle] = useState(page.title);
  const canRename = page.type === 'page';

  const handleBlur = async () => {
    if (!canRename) return;
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === page.title) {
      setDraftTitle(page.title);
      return;
    }

    try {
      await onRename(page.id, nextTitle);
    } catch {
      toast.error(t('titleSaveFailed'));
      setDraftTitle(page.title);
    }
  };

  return (
    <input
      value={draftTitle}
      readOnly={!canRename}
      onChange={(event) => setDraftTitle(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      className="page-title-input"
      placeholder={t('untitledPlaceholder')}
      title={canRename ? t('editPageName') : t('fixedSiteTitle')}
    />
  );
}
