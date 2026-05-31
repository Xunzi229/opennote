import { addPage, getWorkspace, updatePageContent } from './storage';
import { appendMarkdown } from './appendMarkdown';
import type { NoteSource } from '../types';

export interface PendingNoteSelect {
  site: string;
  pageId: string;
}

export interface CapturedSelection {
  text?: string;
  html?: string;
  markdown?: string;
}

function generatePageTitle() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()} ${now
    .getHours()
    .toString()
    .padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 新页面`;
}

function resolveSelectionContent(selection: CapturedSelection) {
  return selection.markdown?.trim() || selection.text?.trim() || '';
}

export async function saveSelectionAsPage(
  hostname: string,
  action: { action: 'create' | 'append'; noteId?: string; pageId?: string },
  selection: CapturedSelection,
  source?: NoteSource,
): Promise<string | null> {
  const content = resolveSelectionContent(selection);
  if (!content) return null;

  const targetId = action.pageId ?? action.noteId;
  if (action.action === 'append' && targetId) {
    const workspace = await getWorkspace();
    const existing = workspace.pages[targetId];
    if (existing?.site === hostname) {
      await updatePageContent(targetId, appendMarkdown(existing.content, content));
      return targetId;
    }
  }

  const page = await addPage(hostname, null, content, generatePageTitle(), source);
  return page.id;
}

export const saveSelectionAsNote = saveSelectionAsPage;
