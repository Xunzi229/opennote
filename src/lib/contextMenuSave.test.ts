import { describe, expect, it, vi } from 'vitest';
import { saveSelectionAsNote } from './contextMenuSave';

vi.mock('./storage', () => ({
  getNotes: vi.fn(async () => ({
    'example.com': [{ id: 'note-1', title: 'Old', content: '已有内容', createdAt: 1, updatedAt: 1 }],
  })),
  updateNote: vi.fn(async () => {}),
  addNote: vi.fn(async (_hostname, content, title, source) => ({
    id: 'note-2',
    title,
    content,
    source,
    createdAt: 2,
    updatedAt: 2,
  })),
}));

describe('saveSelectionAsNote', () => {
  it('appends markdown to an existing note', async () => {
    const { updateNote } = await import('./storage');

    const noteId = await saveSelectionAsNote(
      'example.com',
      { action: 'append', noteId: 'note-1' },
      { markdown: '新增内容' },
    );

    expect(noteId).toBe('note-1');
    expect(updateNote).toHaveBeenCalledWith('example.com', 'note-1', '已有内容\n\n新增内容');
  });

  it('creates a new note when append target is missing', async () => {
    const { addNote } = await import('./storage');

    const noteId = await saveSelectionAsNote(
      'example.com',
      { action: 'append', noteId: 'missing' },
      { markdown: '新笔记内容' },
    );

    expect(noteId).toBe('note-2');
    expect(addNote).toHaveBeenCalled();
  });

  it('passes source context when creating a note from a selection', async () => {
    const { addNote } = await import('./storage');
    const source = {
      pageUrl: 'https://example.com/article',
      pageTitle: 'Example Article',
      capturedAt: 123,
      hostname: 'example.com',
    };

    await saveSelectionAsNote(
      'example.com',
      { action: 'create' },
      { markdown: 'selected content' },
      source,
    );

    expect(addNote).toHaveBeenLastCalledWith(
      'example.com',
      'selected content',
      expect.any(String),
      source,
    );
  });
});
