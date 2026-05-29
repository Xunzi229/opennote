import { Globe } from 'lucide-react';

interface SiteItemProps {
  hostname: string;
  noteCount: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SiteItem({ hostname, noteCount, isActive, onClick }: SiteItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
        isActive
          ? 'bg-zinc-100 dark:bg-zinc-800'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <span className="text-sm truncate">{hostname}</span>
      </div>
      <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2">
        {noteCount}
      </span>
    </button>
  );
}