import type { EditorView } from '@codemirror/view';
import type { MarkdownInsertType } from './markdownInsertTypes';
import { buildTableMarkdown } from './tableUtils';

export type { MarkdownInsertType } from './markdownInsertTypes';

const SNIPPETS: Record<MarkdownInsertType, string> = {
  heading2: '## 标题\n',
  heading3: '### 标题\n',
  bold: '**粗体**',
  italic: '*斜体*',
  bulletList: '- 列表项\n',
  orderedList: '1. 列表项\n',
  blockquote: '> 引用内容\n',
  codeBlock: '```\n代码\n```\n',
  link: '[链接文字](https://example.com)',
  table: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n',
  divider: '\n---\n',
};

const WRAP: Partial<Record<MarkdownInsertType, { before: string; after: string; placeholder: string }>> = {
  bold: { before: '**', after: '**', placeholder: '粗体' },
  italic: { before: '*', after: '*', placeholder: '斜体' },
};

const SELECT_RANGE: Partial<Record<MarkdownInsertType, { start: number; end: number }>> = {
  heading2: { start: 3, end: 5 },
  heading3: { start: 4, end: 6 },
  bulletList: { start: 2, end: 5 },
  orderedList: { start: 3, end: 6 },
  blockquote: { start: 2, end: 6 },
  codeBlock: { start: 4, end: 6 },
  link: { start: 1, end: 5 },
};

export function insertAtCursor(
  view: EditorView,
  text: string,
  selectStart?: number,
  selectEnd?: number,
) {
  const { from, to } = view.state.selection.main;

  view.dispatch({
    changes: { from, to, insert: text },
    selection:
      selectStart !== undefined && selectEnd !== undefined
        ? { anchor: from + selectStart, head: from + selectEnd }
        : { anchor: from + text.length },
  });
  view.focus();
}

export function insertTableMarkdown(view: EditorView, rows: number, cols: number) {
  insertAtCursor(view, buildTableMarkdown(rows, cols));
}

export function insertMarkdownSnippet(view: EditorView, type: MarkdownInsertType) {
  const wrap = WRAP[type];
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (wrap) {
    const text = selected || wrap.placeholder;
    const insert = wrap.before + text + wrap.after;

    if (selected) {
      insertAtCursor(view, insert);
      return;
    }

    insertAtCursor(
      view,
      insert,
      wrap.before.length,
      wrap.before.length + text.length,
    );
    return;
  }

  const snippet = SNIPPETS[type];
  const range = SELECT_RANGE[type];
  insertAtCursor(view, snippet, range?.start, range?.end);
}
