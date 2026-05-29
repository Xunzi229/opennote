import { useEffect, useMemo } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useActiveSite } from '../hooks/useActiveSite';
import { getNoteExcerpt, formatRelativeTime } from '../lib/noteStats';
import { getSiteFaviconUrl } from '../lib/favicon';
import {
  Plus,
  Pin,
  Star,
  ArrowUpDown,
  Filter,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type { NoteFilter } from '../types';

export default function NoteListPanel() {
  const {
    notes,
    currentSite,
    setCurrentSite,
    selectedNoteId,
    setSelectedNoteId,
    sortedNotes,
    noteFilter,
    searchQuery,
    setNoteFilter,
    addNote,
  } = useNotesStore();

  const actualCurrentSite = useActiveSite();
  const activeSite = currentSite ?? actualCurrentSite;
  const siteNotes = useMemo(
    () => (activeSite ? sortedNotes(activeSite) : []),
    [activeSite, notes, noteFilter, searchQuery, sortedNotes],
  );
  const siteNoteIds = useMemo(() => siteNotes.map((note) => note.id).join(','), [siteNotes]);

  useEffect(() => {
    if (!currentSite && actualCurrentSite) {
      setCurrentSite(actualCurrentSite);
    }
  }, [currentSite, actualCurrentSite, setCurrentSite]);

  useEffect(() => {
    if (!activeSite) return;

    if (siteNotes.length === 0) {
      setSelectedNoteId(null);
      return;
    }

    const hasSelectedNote = selectedNoteId
      ? siteNotes.some((note) => note.id === selectedNoteId)
      : false;

    if (!hasSelectedNote) {
      setSelectedNoteId(siteNotes[0].id);
    }
  }, [activeSite, siteNoteIds, selectedNoteId, setSelectedNoteId]);

  const ensureCurrentSite = (site: string) => {
    if (!currentSite) setCurrentSite(site);
  };

  const generateTitle = () => {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 新笔记`;
  };

  const handleCreateNote = async () => {
    if (!activeSite) return;
    ensureCurrentSite(activeSite);
    const note = await addNote(activeSite, '', generateTitle());
    setSelectedNoteId(note.id);
  };

  const filters: { id: NoteFilter; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'pinned', label: '置顶' },
    { id: 'tagged', label: '有标签' },
  ];

  if (!activeSite) {
    return (
      <aside className="panel panel-notes">
        <div className="empty-state h-full flex flex-col items-center justify-center">
          <FileText className="empty-state-icon" />
          <p className="text-[14px] font-medium text-[var(--color-text)]">选择一个网站</p>
          <p className="text-[13px] mt-2">从左侧选择网站，或访问网页后打开插件</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel panel-notes">
      <div className="px-4 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 mb-3">
          <img
            src={getSiteFaviconUrl(activeSite, 32)}
            alt=""
            className="w-5 h-5 rounded-[4px] object-contain"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold truncate">{activeSite}</h2>
            <p className="text-[12px] text-[var(--color-text-secondary)]">{siteNotes.length} 条笔记</p>
          </div>
          {actualCurrentSite && actualCurrentSite !== activeSite && (
            <button
              onClick={() => setCurrentSite(actualCurrentSite)}
              className="btn btn-ghost btn-icon"
              title={`切换到 ${actualCurrentSite}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-secondary flex-1" title="按更新时间排序">
            <ArrowUpDown className="w-3.5 h-3.5" />
            按更新时间
          </button>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none" />
            <select
              value={noteFilter}
              onChange={(e) => setNoteFilter(e.target.value as NoteFilter)}
              className="input-field !pl-8 !pr-8 !w-[108px] appearance-none cursor-pointer"
            >
              {filters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-[var(--color-border)]">
        <button onClick={handleCreateNote} className="btn btn-primary w-full">
          <Plus className="w-4 h-4" />
          新建笔记
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {siteNotes.length === 0 ? (
          <div className="empty-state">
            <p className="text-[13px]">还没有笔记</p>
          </div>
        ) : (
          siteNotes.map((note) => {
            const isActive = selectedNoteId === note.id;
            return (
              <button
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full text-left p-3 rounded-[12px] border transition-all ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[inset_3px_0_0_0_var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[#cbd5e1] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[13px] font-medium text-[var(--color-text)] line-clamp-1">
                    {note.title}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {note.pinned && <Pin className="w-3 h-3 text-[var(--color-primary)]" />}
                    {note.favorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  </div>
                </div>
                <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                  {getNoteExcerpt(note.content)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#94a3b8]">{formatRelativeTime(note.updatedAt)}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(note.tags || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
