import { useState } from 'react';
import { Globe } from 'lucide-react';
import { getSiteFaviconUrl } from '../lib/favicon';

interface SiteItemProps {
  hostname: string;
  noteCount: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SiteItem({ hostname, noteCount, isActive, onClick }: SiteItemProps) {
  const [iconError, setIconError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-left transition-all ${
        isActive
          ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-soft-text)]'
          : 'text-[var(--color-text)] hover:bg-[#f8fafc]'
      }`}
    >
      {iconError ? (
        <Globe className="w-4 h-4 flex-shrink-0 text-[var(--color-text-secondary)]" />
      ) : (
        <img
          src={getSiteFaviconUrl(hostname, 32)}
          alt=""
          className="w-4 h-4 flex-shrink-0 rounded-[4px] object-contain"
          onError={() => setIconError(true)}
        />
      )}
      <span className="text-[13px] truncate flex-1">{hostname}</span>
      <span
        className={`text-[11px] flex-shrink-0 ${
          isActive ? 'text-[var(--color-primary-soft-text)]' : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {noteCount}
      </span>
    </button>
  );
}
