import { htmlToMarkdown } from './htmlToMarkdown';

export interface PendingNotePayload {
  action?: 'create' | 'append';
  noteId?: string;
  html?: string;
  text?: string;
}

export function normalizePendingPayload(pending: unknown): PendingNotePayload {
  if (typeof pending === 'string') {
    return { action: 'create', text: pending };
  }

  if (!pending || typeof pending !== 'object') {
    return {};
  }

  return pending as PendingNotePayload;
}

export function resolvePendingNoteContent(pending: unknown): string {
  const payload = normalizePendingPayload(pending);
  const { html, text } = payload;

  if (html?.trim()) {
    const markdown = htmlToMarkdown(html);
    if (markdown) return markdown;
  }

  return text?.trim() ?? '';
}
