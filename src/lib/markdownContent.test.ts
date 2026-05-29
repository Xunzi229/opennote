import { describe, it, expect } from 'vitest';
import { contentToMarkdown, isContentEmpty, contentPreview } from './markdownContent';

describe('markdownContent', () => {
  it('returns string content as-is', () => {
    expect(contentToMarkdown('# Hello')).toBe('# Hello');
  });

  it('converts ProseMirror doc to markdown', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Body text' }],
        },
      ],
    };

    expect(contentToMarkdown(doc)).toBe('## Title\n\nBody text');
  });

  it('detects empty content', () => {
    expect(isContentEmpty('')).toBe(true);
    expect(isContentEmpty('   \n  ')).toBe(true);
    expect(isContentEmpty({ type: 'doc', content: [] })).toBe(true);
    expect(isContentEmpty('hello')).toBe(false);
  });

  it('generates preview text', () => {
    expect(contentPreview('hello world', 5)).toBe('hello');
  });
});
