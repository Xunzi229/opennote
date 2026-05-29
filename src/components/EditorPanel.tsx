import { useState, useCallback, useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import MarkdownEditor from './MarkdownEditor';
import { isContentEmpty, contentToMarkdown } from '../lib/markdownContent';
import { getNoteStats, formatRelativeTime } from '../lib/noteStats';
import {
  FileText,
  Trash2,
  Star,
  Pin,
  Tag,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import PromptDialog from './PromptDialog';

export default function EditorPanel() {
  const {
    currentSite,
    selectedNoteId,
    setSelectedNoteId,
    sortedNotes,
    addNote,
    updateNote,
    deleteNote,
    toggleNotePin,
    toggleNoteFavorite,
    addNoteTag,
  } = useNotesStore();

  const actualCurrentSite = useActiveSite();
  const activeSite = currentSite ?? actualCurrentSite;
  const siteNotes = activeSite ? sortedNotes(activeSite) : [];
  const selectedNote = siteNotes.find((n) => n.id === selectedNoteId) || null;

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [editorContent, setEditorContent] = useState('');
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (selectedNote) {
      setEditorContent(contentToMarkdown(selectedNote.content));
    }
  }, [selectedNote?.id]);

  const debouncedSave = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (site: string, id: string, content: string) => {
        clearTimeout(timeout);
        if (isContentEmpty(content)) {
          setSaveStatus('saved');
          return;
        }
        setSaveStatus('saving');
        timeout = setTimeout(async () => {
          try {
            await updateNote(site, id, content);
            setSaveStatus('saved');
          } catch {
            setSaveStatus('error');
            toast.error('保存失败');
          }
        }, 2000);
      };
    })(),
    [updateNote],
  );

  const handleEditorUpdate = (content: string) => {
    setEditorContent(content);
    if (activeSite && selectedNote && !isContentEmpty(content)) {
      debouncedSave(activeSite, selectedNote.id, content);
    }
  };

  const handleDeleteNote = async () => {
    if (!activeSite || !selectedNote) return;
    await deleteNote(activeSite, selectedNote.id);
    const remaining = siteNotes.filter((n) => n.id !== selectedNote.id);
    setSelectedNoteId(remaining[0]?.id ?? null);
    toast.success('笔记已删除');
  };

  const handleAddTag = () => {
    if (!activeSite || !selectedNote) return;
    setTagInput('');
    setShowTagDialog(true);
  };

  const handleConfirmTag = async () => {
    if (!activeSite || !selectedNote) return;
    const tag = tagInput.trim();
    if (!tag) return;

    await addNoteTag(activeSite, selectedNote.id, tag);
    setShowTagDialog(false);
    setTagInput('');
    toast.success('标签已添加');
  };

  const handleCreateFirstNote = async () => {
    if (!activeSite) return;
    const now = new Date();
    const title = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 新笔记`;
    const note = await addNote(activeSite, '', title);
    setSelectedNoteId(note.id);
  };

  if (!activeSite) {
    return (
      <main className="panel panel-editor">
        <div className="empty-state h-full flex flex-col items-center justify-center">
          <FileText className="empty-state-icon" />
          <p className="text-[14px] font-medium">等待选择网站</p>
        </div>
      </main>
    );
  }

  if (!selectedNote) {
    return (
      <main className="panel panel-editor">
        <div className="empty-state h-full flex flex-col items-center justify-center">
          <FileText className="empty-state-icon" />
          <p className="text-[14px] font-medium text-[var(--color-text)]">选择或创建一条笔记</p>
          <button onClick={handleCreateFirstNote} className="btn btn-primary mt-4">
            新建笔记
          </button>
        </div>
      </main>
    );
  }

  const stats = getNoteStats(editorContent || selectedNote.content);

  return (
    <main className="panel panel-editor">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => toggleNotePin(activeSite, selectedNote.id)}
            className={`btn btn-ghost btn-icon ${selectedNote.pinned ? 'text-[var(--color-primary)]' : ''}`}
            title="置顶"
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleNoteFavorite(activeSite, selectedNote.id)}
            className={`btn btn-ghost btn-icon ${selectedNote.favorite ? 'text-amber-500' : ''}`}
            title="收藏"
          >
            <Star className={`w-4 h-4 ${selectedNote.favorite ? 'fill-amber-500' : ''}`} />
          </button>
          <button onClick={handleAddTag} className="btn btn-ghost btn-icon" title="添加标签">
            <Tag className="w-4 h-4" />
          </button>
          <button onClick={handleDeleteNote} className="btn btn-ghost btn-icon text-[var(--color-danger)]" title="删除">
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="btn btn-ghost btn-icon" title="更多">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[12px] text-[var(--color-text-secondary)]">
          {saveStatus === 'saving' && '保存中...'}
          {saveStatus === 'saved' && '已自动保存'}
          {saveStatus === 'error' && <span className="text-[var(--color-danger)]">保存失败</span>}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <MarkdownEditor
          key={selectedNote.id}
          noteId={selectedNote.id}
          content={selectedNote.content}
          onUpdate={handleEditorUpdate}
        />
      </div>

      <div className="px-5 py-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[12px] text-[var(--color-text-secondary)] bg-[#fafafa]">
        <span>最后编辑 {formatRelativeTime(selectedNote.updatedAt)}</span>
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
