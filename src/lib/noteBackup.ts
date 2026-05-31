import type { Note, NotesStore } from '../types';
import { contentToMarkdown } from './markdownContent';

const BACKUP_FORMAT = 'opennote.notes.v1';

interface NotesBackup {
  format: typeof BACKUP_FORMAT;
  exportedAt: number;
  notes: NotesStore;
}

export function serializeNotesBackup(notes: NotesStore, exportedAt = Date.now()): string {
  const backup: NotesBackup = {
    format: BACKUP_FORMAT,
    exportedAt,
    notes,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseNotesBackup(json: string): NotesStore {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('备份文件不是有效 JSON');
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new Error('备份格式不受支持');
  }

  if (!isNotesStore(parsed.notes)) {
    throw new Error('备份文件缺少有效笔记数据');
  }

  return parsed.notes;
}

export function serializeNotesMarkdown(notes: NotesStore, exportedAt = Date.now()): string {
  const lines = ['# OpenNote Export', '', `Exported at: ${formatDate(exportedAt)}`, ''];

  for (const hostname of Object.keys(notes).sort()) {
    lines.push(`## ${hostname}`, '');

    const siteNotes = [...(notes[hostname] || [])].sort((a, b) => b.updatedAt - a.updatedAt);
    for (const note of siteNotes) {
      lines.push(`### ${note.title.trim() || 'Untitled'}`, '');
      lines.push(`- Created: ${formatDate(note.createdAt)}`);
      lines.push(`- Updated: ${formatDate(note.updatedAt)}`);

      if (note.tags?.length) {
        lines.push(`- Tags: ${note.tags.join(', ')}`);
      }

      if (note.source?.pageUrl) {
        const label = note.source.pageTitle?.trim() || note.source.pageUrl;
        lines.push(`- Source: [${escapeMarkdownLinkText(label)}](${note.source.pageUrl})`);
      }

      const content = contentToMarkdown(note.content).trim();
      lines.push('', content || '_No content_', '');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function isNotesStore(value: unknown): value is NotesStore {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.entries(value).every(([hostname, notes]) => {
    return typeof hostname === 'string' && Array.isArray(notes) && notes.every(isNote);
  });
}

function isNote(value: unknown): value is Note {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (typeof value.content === 'string' || isRecord(value.content)) &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/[[\]]/g, '\\$&');
}
