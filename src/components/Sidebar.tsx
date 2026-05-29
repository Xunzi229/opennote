import { useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import SiteItem from './SiteItem';
import ConfirmDialog from './ConfirmDialog';
import { Search, Plus, Trash2 } from 'lucide-react';

export default function Sidebar() {
  const { notes, searchQuery, setSearchQuery, currentSite, setCurrentSite, deleteSite, filteredSites } = useNotesStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);

  const filteredHostnames = filteredSites();

  const handleAddSite = () => {
    const hostname = prompt('输入网站域名（如 example.com）:');
    if (hostname && hostname.trim()) {
      setCurrentSite(hostname.trim());
    }
  };

  const handleDeleteSite = (hostname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToDelete(hostname);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSite = async () => {
    if (siteToDelete) {
      await deleteSite(siteToDelete);
      setShowDeleteConfirm(false);
      setSiteToDelete(null);
    }
  };

  const cancelDeleteSite = () => {
    setShowDeleteConfirm(false);
    setSiteToDelete(null);
  };

  return (
    <>
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">OpenNote</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                网站笔记
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索网站或笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            />
          </div>
        </div>

        {/* Site List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredHostnames.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {searchQuery ? '没有匹配的网站' : '还没有笔记'}
            </div>
          ) : (
            filteredHostnames.map((hostname) => (
              <div
                key={hostname}
                className={`group flex items-center justify-between rounded-md mb-0.5 ${
                  currentSite === hostname ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                }`}
              >
                <div
                  onClick={() => setCurrentSite(hostname)}
                  className="flex-1 cursor-pointer"
                >
                  <SiteItem
                    hostname={hostname}
                    noteCount={notes[hostname]?.length || 0}
                    isActive={currentSite === hostname}
                    onClick={() => setCurrentSite(hostname)}
                  />
                </div>
                <button
                  onClick={(e) => handleDeleteSite(hostname, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                  title="删除网站及所有笔记"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Site Button */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleAddSite}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加网站
          </button>
        </div>
      </div>

      {/* Custom Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除网站"
        message={`确定要删除网站 "${siteToDelete}" 及其所有笔记吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDeleteSite}
        onCancel={cancelDeleteSite}
        danger={true}
      />
    </>
  );
}