import { useNotesStore } from '../store/notesStore';
import SiteItem from './SiteItem';
import { Search, Plus } from 'lucide-react';

export default function Sidebar() {
  const { notes, searchQuery, setSearchQuery, currentSite, setCurrentSite } = useNotesStore();

  const hostnames = Object.keys(notes).sort();
  const filteredHostnames = hostnames.filter((h) =>
    h.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSite = () => {
    const hostname = prompt('输入网站域名（如 example.com）:');
    if (hostname && hostname.trim()) {
      setCurrentSite(hostname.trim());
    }
  };

  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-semibold">OpenNote</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          网站笔记
        </p>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="搜索网站..."
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
            <SiteItem
              key={hostname}
              hostname={hostname}
              noteCount={notes[hostname]?.length || 0}
              isActive={currentSite === hostname}
              onClick={() => setCurrentSite(hostname)}
            />
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
  );
}