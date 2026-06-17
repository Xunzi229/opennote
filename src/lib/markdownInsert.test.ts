import { describe, expect, it } from 'vitest';
import { clearMarkdownFormatting } from './markdownInsert';

describe('clearMarkdownFormatting', () => {
  it('removes common inline and block markdown formatting while preserving text', () => {
    expect(
      clearMarkdownFormatting([
        '## **标题**',
        '> [链接文字](https://example.com) and *斜体*',
        '- `代码`',
      ].join('\n')),
    ).toBe(['标题', '链接文字 and 斜体', '代码'].join('\n'));
  });
});
