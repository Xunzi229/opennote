import { useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import SiteItem from './SiteItem';
import ConfirmDialog from './ConfirmDialog';
import { Search, Plus, Trash2 } from 'lucide-react';

export default function Sidebar() {
  const { notes, searchQuery, setSearchQuery, currentSite, setCurrentSite, deleteSite, filteredSites } =
    useNotesStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);

  const filteredHostnames = filteredSites();

  const handleAddSite = () => {
    const hostname = prompt('输入网站域名（如 example.com）:');
    if (hostname?.trim()) {
      setCurrentSite(hostname.trim());
    }
  };

  const handleDeleteSite = (hostname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToDelete(hostname);
    setShowDeleteConfirm(true);
  };

  return (
    <>
      <aside className="panel panel-sidebar">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OpenNote" className="logo-mark" />
            <div>
              <h1 className="text-[15px] font-semibold text-[var(--color-text)] leading-none">OpenNote</h1>
              <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">网站笔记</p>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="搜索网站或笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filteredHostnames.length === 0 ? (
            <div className="empty-state">
              <p className="text-[13px]">{searchQuery ? '没有匹配的网站' : '还没有笔记'}</p>
            </div>
          ) : (
            filteredHostnames.map((hostname) => (
              <div key={hostname} className="group flex items-center mb-1">
                <div className="flex-1 min-w-0">
                  <SiteItem
                    hostname={hostname}
                    noteCount={notes[hostname]?.length || 0}
                    isActive={currentSite === hostname}
                    onClick={() => setCurrentSite(hostname)}
                  />
                </div>
                <button
                  onClick={(e) => handleDeleteSite(hostname, e)}
                  className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-icon ml-1 text-[var(--color-danger)]"
                  title="删除网站及所有笔记"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="panel-footer">
          <button onClick={handleAddSite} className="btn btn-secondary w-full">
            <Plus className="w-4 h-4" />
            添加网站
          </button>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="删除网站"
        message={`确定要删除网站 "${siteToDelete}" 及其所有笔记吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={async () => {
          if (siteToDelete) {
            await deleteSite(siteToDelete);
            setShowDeleteConfirm(false);
            setSiteToDelete(null);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSiteToDelete(null);
        }}
        danger
      />
    </>
  );
}
