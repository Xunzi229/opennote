import { useState, useEffect, useCallback } from 'react';
import { useNotesStore } from '../store/notesStore';
import type { Note } from '../types';
import TipTapEditor from './TipTapEditor';
import { FileText, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function EditorPanel() {
  const { currentSite, addNote, updateNote, deleteNote, updateNoteTitle, filteredNotes, setCurrentSite } = useNotesStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [_editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [showNoteList, setShowNoteList] = useState(true);
  const [actualCurrentSite, setActualCurrentSite] = useState<string | null>(null);

  const siteNotes = currentSite ? filteredNotes(currentSite) : [];
  const selectedNote = siteNotes.find((n) => n.id === selectedNoteId) || null;

  // Detect actual current tab
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          if (!url.protocol.startsWith('chrome')) {
            setActualCurrentSite(url.hostname);
          }
        } catch {
          // Invalid URL
        }
      }
    });
  }, []);

  // Auto-select first note or create new one when site changes
  useEffect(() => {
    if (currentSite) {
      if (siteNotes.length > 0) {
        setSelectedNoteId(siteNotes[0].id);
      } else {
        setSelectedNoteId(null);
      }
    }
  }, [currentSite]);

  // Debounced auto-save
  const debouncedSave = useCallback(
    (() => {
      let timeout: ReturnType<typeof setTimeout>;
      return (site: string, id: string, content: any) => {
        clearTimeout(timeout);
        setSaveStatus('saving');
        timeout = setTimeout(async () => {
          try {
            await updateNote(site, id, content);
            setSaveStatus('saved');
          } catch (err) {
            setSaveStatus('error');
            toast.error('保存失败');
          }
        }, 2000);
      };
    })(),
    [updateNote]
  );

  const handleEditorUpdate = (content: any) => {
    if (currentSite && selectedNote) {
      debouncedSave(currentSite, selectedNote.id, content);
    }
  };

  // Generate title from timestamp + first 10 non-whitespace chars of content
  const generateTitle = (content: any): string => {
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || '';
      if (node.content) return node.content.map(extractText).join('');
      return '';
    };

    const fullText = extractText(content);
    const nonWhitespace = fullText.replace(/\s/g, '').slice(0, 10);

    return nonWhitespace ? `${timeStr} ${nonWhitespace}` : `${timeStr} 新笔记`;
  };

  const handleCreateNote = async () => {
    if (!currentSite) return;

    const emptyContent = { type: 'doc', content: [] };
    const title = generateTitle(emptyContent);
    const newNote = await addNote(currentSite, emptyContent, title);
    setSelectedNoteId(newNote.id);
    toast.success('已创建新笔记');
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSite) return;

    if (!confirm('确定删除这条笔记？')) return;

    await deleteNote(currentSite, noteId);
    if (selectedNoteId === noteId) {
      const remaining = siteNotes.filter((n) => n.id !== noteId);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('笔记已删除');
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setSaveStatus('saved');
  };

  const handleStartEditTitle = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleId(note.id);
    setEditingTitleValue(note.title);
  };

  const handleSaveTitle = async (noteId: string) => {
    if (!currentSite || !editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }

    try {
      await updateNoteTitle(currentSite, noteId, editingTitleValue.trim());
      setEditingTitleId(null);
      toast.success('标题已更新');
    } catch (err) {
      toast.error('更新标题失败');
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const handleSwitchToCurrentTab = () => {
    if (actualCurrentSite) {
      setCurrentSite(actualCurrentSite);
      toast.success(`已切换到 ${actualCurrentSite}`);
    }
  };

  const isOnDifferentSite = actualCurrentSite && currentSite && actualCurrentSite !== currentSite;

  if (!currentSite) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <FileText className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <h2 className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
            选择一个网站开始记录
          </h2>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
            从左侧列表选择网站，或访问任意网页后打开插件
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNoteList(!showNoteList)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            title={showNoteList ? '隐藏笔记列表' : '显示笔记列表'}
          >
            {showNoteList ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <h2 className="text-lg font-semibold">{currentSite}</h2>
          <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500">
            {siteNotes.length} 条笔记
          </span>
          {isOnDifferentSite && (
            <button
              onClick={handleSwitchToCurrentTab}
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              title={`切换到当前标签页: ${actualCurrentSite}`}
            >
              <RefreshCw className="w-3 h-3" />
              回到当前标签页
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs text-zinc-400">保存中...</span>
          )}
          {saveStatus === 'saved' && selectedNote && (
            <span className="text-xs text-green-500">已保存</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">保存失败</span>
          )}
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建笔记
          </button>
        </div>
      </div>

      {/* Content Area - Two Column Layout (Note List + Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Note List - Collapsible */}
        {showNoteList && (
          <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-2 flex-shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-xs text-zinc-400">笔记列表</div>
            </div>
            {siteNotes.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-400">
                还没有笔记
              </div>
            ) : (
              siteNotes.map((note: Note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note.id)}
                  className={`group p-3 mb-1 rounded-lg cursor-pointer border transition-colors ${
                    selectedNoteId === note.id
                      ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900'
                      : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    {_editingTitleId === note.id ? (
                      <input
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onBlur={() => handleSaveTitle(note.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(note.id);
                          if (e.key === 'Escape') handleCancelEditTitle();
                        }}
                        className="text-sm font-medium bg-transparent border-b border-zinc-400 focus:outline-none flex-1 mr-2"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        onClick={(e) => handleStartEditTitle(note, e)}
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate cursor-text hover:underline flex-1 mr-2"
                        title="点击编辑标题"
                      >
                        {note.title}
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3 text-zinc-400" />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {new Date(note.updatedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Toggle Note List Button (when hidden) */}
        {!showNoteList && (
          <button
            onClick={() => setShowNoteList(true)}
            className="w-8 border-r border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
            title="显示笔记列表"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Editor - Takes remaining space */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedNote ? (
            <TipTapEditor
              content={selectedNote.content}
              onUpdate={handleEditorUpdate}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-400">选择或创建一条笔记开始编辑</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}