import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import MarkdownEditor from './MarkdownEditor';
import { contentToMarkdown } from '../lib/markdownContent';
import { getNoteStats, formatRelativeTime } from '../lib/noteStats';
import {
  ExternalLink,
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
        toast.error('保存失败');
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
    toast.success('页面已删除');
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
    toast.success('标签已添加');
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedPage) return;
    await removePageTag(selectedPage.id, tag);
    toast.success('标签已移除');
  };

  const handleCreateFirstPage = async () => {
    if (!activeSite) {
      toast.error('请先打开一个网页或添加站点');
      return;
    }
    const root = await ensureSiteRoot(activeSite);
    const page = await addPage(activeSite, root.id);
    setSelectedPageId(page.id);
  };

  if (!selectedPage) {
    return (
      <main className="panel panel-editor">
        <div className="empty-state h-full flex flex-col items-center justify-center">
          <FileText className="empty-state-icon" />
          <p className="text-[14px] font-medium text-[var(--color-text)]">选择或创建一个页面</p>
          <button onClick={handleCreateFirstPage} className="btn btn-primary mt-4">
            新建页面
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
              className={`btn btn-ghost btn-icon ${selectedPage.pinned ? 'text-[var(--color-primary)]' : ''}`}
              title="置顶"
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              onClick={() => togglePageFavorite(selectedPage.id)}
              className={`btn btn-ghost btn-icon ${selectedPage.favorite ? 'text-amber-500' : ''}`}
              title="收藏"
            >
              <Star className={`w-4 h-4 ${selectedPage.favorite ? 'fill-amber-500' : ''}`} />
            </button>
            <button onClick={handleAddTag} className="btn btn-ghost btn-icon" title="添加标签">
              <Tag className="w-4 h-4" />
            </button>
            {selectedPage.type === 'page' && (
              <button
                onClick={handleDeletePage}
                className="btn btn-ghost btn-icon text-[var(--color-danger)]"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button className="btn btn-ghost btn-icon" title="更多">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {(selectedPage.tags || []).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="tag gap-1 hover:text-[var(--color-danger)]"
                title={`移除标签：${tag}`}
                aria-label={`移除标签：${tag}`}
              >
                <span>{tag}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>

          <div className="text-[12px] text-[var(--color-text-secondary)] shrink-0">
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'saved' && '已自动保存'}
            {saveStatus === 'error' && <span className="text-[var(--color-danger)]">保存失败</span>}
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
          <span className="shrink-0">最后编辑 {formatRelativeTime(selectedPage.updatedAt)}</span>
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
          {stats.chars} 字 · {stats.lines} 行
        </span>
      </div>

      <PromptDialog
        isOpen={showTagDialog}
        title="添加标签"
        label="标签名称"
        placeholder="输入标签名称"
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
      toast.error('标题保存失败');
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
      title={canRename ? '编辑页面名称' : '站点目录名称固定'}
    />
  );
}
