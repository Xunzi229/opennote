import { describe, expect, it } from 'vitest';
import { parseNotesBackup, serializeNotesBackup, serializeNotesMarkdown } from './noteBackup';
import type { NotesStore } from '../types';

describe('note backup helpers', () => {
  it('serializes notes with a stable backup format', () => {
    const notes: NotesStore = {
      'example.com': [
        {
          id: 'note-1',
          title: 'Example',
          content: 'hello',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    };

    const json = serializeNotesBackup(notes, 123);
    const backup = JSON.parse(json);

    expect(backup).toEqual({
      format: 'opennote.notes.v1',
      exportedAt: 123,
      notes,
    });
  });

  it('parses a valid notes backup', () => {
    const notes: NotesStore = {
      'example.com': [
        {
          id: 'note-1',
          title: 'Example',
          content: 'hello',
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    };

    const parsed = parseNotesBackup(JSON.stringify({
      format: 'opennote.notes.v1',
      exportedAt: 123,
      notes,
    }));

    expect(parsed).toEqual(notes);
  });

  it('rejects invalid backup content', () => {
    expect(() => parseNotesBackup('not json')).toThrow('备份文件不是有效 JSON');
    expect(() => parseNotesBackup(JSON.stringify({ format: 'other', notes: {} }))).toThrow(
      '备份格式不受支持',
    );
    expect(() => parseNotesBackup(JSON.stringify({ format: 'opennote.notes.v1', notes: [] }))).toThrow(
      '备份文件缺少有效笔记数据',
    );
  });

  it('serializes notes to a readable markdown document', () => {
    const notes: NotesStore = {
      'example.com': [
        {
          id: 'note-1',
          title: 'Example Note',
          content: 'hello markdown',
          createdAt: Date.UTC(2026, 4, 31),
          updatedAt: Date.UTC(2026, 4, 31, 1),
          tags: ['docs', 'web'],
          source: {
            pageUrl: 'https://example.com/article',
            pageTitle: 'Example Article',
            capturedAt: Date.UTC(2026, 4, 31, 2),
            hostname: 'example.com',
          },
        },
      ],
    };

    const markdown = serializeNotesMarkdown(notes, Date.UTC(2026, 4, 31, 3));

    expect(markdown).toContain('# OpenNote Export');
    expect(markdown).toContain('Exported at: 2026-05-31');
    expect(markdown).toContain('## example.com');
    expect(markdown).toContain('### Example Note');
    expect(markdown).toContain('- Tags: docs, web');
    expect(markdown).toContain('- Source: [Example Article](https://example.com/article)');
    expect(markdown).toContain('hello markdown');
  });
});
