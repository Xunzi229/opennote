import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import MarkdownEditor from './MarkdownEditor';
import { contentToMarkdown } from '../lib/markdownContent';
import { getNoteStats, formatRelativeTime } from '../lib/noteStats';
import {
  Copy,
  CopyPlus,
  ExternalLink,
  FilePlus2,
  FileText,
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
      <main className="panel panel-editor">
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
  return (
    <main className="panel panel-editor">
      <div className="px-5 py-3 border-b border-[var(--color-border)]">
        <PageTitleInput
          key={selectedPage.id}
          page={selectedPage}
          onRename={updatePageTitle}
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => togglePagePin(selectedPage.id)}
              className={`btn btn-ghost btn-icon ${
                selectedPage.pinned
                  ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]'
                  : ''
              }`}
              title={selectedPage.pinned ? t('unpin') : t('pin')}
              aria-label={selectedPage.pinned ? t('unpin') : t('pin')}
              aria-pressed={Boolean(selectedPage.pinned)}
            >
              <Pin className={`w-4 h-4 ${selectedPage.pinned ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => togglePageFavorite(selectedPage.id)}
              className={`btn btn-ghost btn-icon ${selectedPage.favorite ? 'text-amber-500' : ''}`}
              title={t('favorite')}
            >
              <Star className={`w-4 h-4 ${selectedPage.favorite ? 'fill-amber-500' : ''}`} />
            </button>
            <button onClick={handleAddTag} className="btn btn-ghost btn-icon" title={t('addTag')}>
              <Tag className="w-4 h-4" />
            </button>
            {selectedPage.type === 'page' && (
              <button
                onClick={handleDeletePage}
                className="btn btn-ghost btn-icon text-[var(--color-danger)]"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuPageId(isMoreMenuOpen ? null : selectedPage.id)}
                className={`btn btn-ghost btn-icon ${
                  isMoreMenuOpen ? 'bg-[var(--color-muted)] text-[var(--color-primary-hover)]' : ''
                }`}
                title={t('moreActions')}
                aria-label={t('moreActions')}
                aria-haspopup="menu"
                aria-expanded={isMoreMenuOpen}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {isMoreMenuOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-[8px] border border-[var(--color-border)] bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCreateChildPage}
                    className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                  >
                    <FilePlus2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('newChildPage')}
                  </button>
                  {selectedPage.type === 'page' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleDuplicatePage}
                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                    >
                      <CopyPlus className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t('copyPage')}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      handleCopyText(contentToMarkdown(selectedPage.content), t('markdownCopied'))
                    }
                    className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('copyMarkdown')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleCopyText(selectedPage.title, t('titleCopied'))}
                    className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    {t('copyTitle')}
                  </button>
                  {selectedPage.source?.pageUrl && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleOpenSource}
                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-text)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      {t('openSource')}
                    </button>
                  )}
                  {selectedPage.type === 'page' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleDeletePage}
                      className="w-full px-3 py-2 text-left text-[13px] text-[var(--color-danger)] hover:bg-[var(--color-muted)] inline-flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('deletePage')}
                    </button>
                  )}
                </div>
              )}
            </div>
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
          </div>

          <div className="text-[12px] text-[var(--color-text-secondary)] shrink-0">
            {saveStatus === 'saving' && t('saving')}
            {saveStatus === 'saved' && t('saved')}
            {saveStatus === 'error' && <span className="text-[var(--color-danger)]">{t('saveFailed')}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <MarkdownEditor
          key={selectedPage.id}
          noteId={selectedPage.id}
          content={selectedPage.content}
          onUpdate={handleEditorUpdate}
        />
      </div>

      <div className="px-5 py-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[12px] text-[var(--color-text-secondary)] bg-[var(--color-muted)]">
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
              <span className="truncate">
                {selectedPage.source.pageTitle || selectedPage.source.hostname}
              </span>
            </a>
          )}
        </div>
        <span>
          {t('charsLines', { chars: stats.chars, lines: stats.lines })}
        </span>
      </div>

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
      className="w-full bg-transparent text-[22px] font-semibold text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-secondary)]"
      placeholder="Untitled"
      title={canRename ? t('editPageName') : t('fixedSiteTitle')}
    />
  );
}
