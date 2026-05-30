import { describe, expect, it } from 'vitest';
import { appendMarkdown } from './appendMarkdown';
import { htmlToMarkdown } from './htmlToMarkdown';
import { resolvePendingNoteContent } from './pendingNoteContent';

describe('htmlToMarkdown', () => {
  it('converts basic rich text to markdown', () => {
    const markdown = htmlToMarkdown(
      '<p><strong>标题</strong> and <em>emphasis</em> with <a href="https://example.com">link</a></p>',
    );

    expect(markdown).toContain('**标题**');
    expect(markdown).toContain('*emphasis*');
    expect(markdown).toContain('[link](https://example.com)');
  });

  it('converts lists to markdown', () => {
    const markdown = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>');
    expect(markdown).toMatch(/- +one/);
    expect(markdown).toMatch(/- +two/);
  });
});

describe('resolvePendingNoteContent', () => {
  it('prefers html conversion over plain text', () => {
    const markdown = resolvePendingNoteContent({
      action: 'create',
      html: '<p><strong>rich</strong></p>',
      text: 'rich',
    });

    expect(markdown).toBe('**rich**');
  });

  it('falls back to plain text', () => {
    expect(resolvePendingNoteContent({ text: 'plain note' })).toBe('plain note');
    expect(resolvePendingNoteContent('legacy plain note')).toBe('legacy plain note');
  });
});

describe('appendMarkdown', () => {
  it('joins existing and new content with blank line', () => {
    expect(appendMarkdown('第一段', '第二段')).toBe('第一段\n\n第二段');
    expect(appendMarkdown('', '新内容')).toBe('新内容');
  });
});
