import { useEffect, useRef, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import SiteItem from './SiteItem';
import ConfirmDialog from './ConfirmDialog';
import { Download, FileText, Search, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportNotesBackup,
  exportNotesMarkdown,
  getNotesStorageUsage,
  importNotesBackup,
  type StorageUsage,
} from '../lib/storage';
import { normalizeSiteInput } from '../lib/siteInput';

export default function Sidebar() {
  const { notes, searchQuery, setSearchQuery, currentSite, setCurrentSite, deleteSite, filteredSites, loadNotes } =
    useNotesStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const filteredHostnames = filteredSites();

  useEffect(() => {
    let cancelled = false;

    void getNotesStorageUsage()
      .then((usage) => {
        if (!cancelled) setStorageUsage(usage);
      })
      .catch(() => {
        if (!cancelled) setStorageUsage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [notes]);

  const handleAddSite = () => {
    const input = prompt('输入网站域名或 URL（如 example.com）:');
    if (!input) return;
    const hostname = normalizeSiteInput(input);
    if (hostname) {
      setCurrentSite(hostname);
    } else {
      toast.error('请输入有效的网站域名或 URL');
    }
  };

  const handleDeleteSite = (hostname: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSiteToDelete(hostname);
    setShowDeleteConfirm(true);
  };

  const handleExportNotes = async () => {
    try {
      const json = await exportNotesBackup();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(json, `opennote-backup-${date}.json`, 'application/json');
      toast.success('笔记已导出');
    } catch {
      toast.error('导出失败');
    }
  };

  const handleExportMarkdown = async () => {
    try {
      const markdown = await exportNotesMarkdown();
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(markdown, `opennote-notes-${date}.md`, 'text/markdown');
      toast.success('Markdown 已导出');
    } catch {
      toast.error('Markdown 导出失败');
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm('导入备份会替换当前所有本地笔记，确定继续吗？');
    if (!confirmed) return;

    try {
      await importNotesBackup(await file.text());
      await loadNotes();
      toast.success('笔记已导入');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入失败');
    }
  };

  const usageText = storageUsage ? formatStorageUsage(storageUsage) : null;

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
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button onClick={handleExportNotes} className="btn btn-secondary w-full !px-2" title="导出 JSON 备份">
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button onClick={handleExportMarkdown} className="btn btn-secondary w-full !px-2" title="导出 Markdown">
              <FileText className="w-4 h-4" />
              MD
            </button>
            <button onClick={handleImportClick} className="btn btn-secondary w-full !px-2" title="导入 JSON 备份">
              <Upload className="w-4 h-4" />
              导入
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
              本地已用 {usageText}
            </div>
          )}
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
