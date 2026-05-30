import { addNote, getNotes, updateNote } from './storage';
import { appendMarkdown } from './appendMarkdown';

export interface PendingNoteSelect {
  site: string;
  noteId: string;
}

export interface CapturedSelection {
  text?: string;
  html?: string;
  markdown?: string;
}

function generateNoteTitle() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 新笔记`;
}

function resolveSelectionContent(selection: CapturedSelection) {
  return selection.markdown?.trim() || selection.text?.trim() || '';
}

export async function saveSelectionAsNote(
  hostname: string,
  action: { action: 'create' | 'append'; noteId?: string },
  selection: CapturedSelection,
): Promise<string | null> {
  const content = resolveSelectionContent(selection);
  if (!content) return null;

  if (action.action === 'append' && action.noteId) {
    const notes = await getNotes();
    const existing = notes[hostname]?.find((note) => note.id === action.noteId);
    if (existing) {
      await updateNote(hostname, action.noteId, appendMarkdown(existing.content, content));
      return action.noteId;
    }
  }

  const note = await addNote(hostname, content, generateNoteTitle());
  return note.id;
}
