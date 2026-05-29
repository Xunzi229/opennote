import { useNotesStore } from '../store/notesStore';
import { FileText } from 'lucide-react';

export default function EditorPanel() {
  const { currentSite, notes } = useNotesStore();

  const siteNotes = currentSite ? notes[currentSite] || [] : [];

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
          <h2 className="text-lg font-semibold">{currentSite}</h2>
          <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500">
            {siteNotes.length} 条笔记
          </span>
        </div>
      </div>

      {/* Editor Area - Placeholder until Phase 4 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <button className="px-4 py-2 text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
              + 新建笔记
            </button>
          </div>

          {siteNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
              <p>还没有笔记</p>
              <p className="text-sm mt-1">点击上方按钮开始记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {siteNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  <div className="text-xs text-zinc-400 mb-1">
                    {new Date(note.updatedAt).toLocaleString('zh-CN')}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {JSON.stringify(note.content).slice(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}