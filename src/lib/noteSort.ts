import type { Note } from '../types';

export function sortSiteNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function truncateMenuTitle(title: string, maxLength = 48): string {
  const trimmed = title.trim() || '无标题';
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
