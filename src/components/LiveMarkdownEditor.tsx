import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from '@tiptap/markdown';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import TableDimensionHandle from './TableDimensionHandle';

import type { JSONContent, MarkdownParseHelpers, MarkdownToken } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { MarkdownInsertType } from '../lib/markdownInsertTypes';

interface LiveMarkdownEditorProps {
  content: string;
  noteId: string;
  onUpdate: (markdown: string) => void;
  onBlur?: () => void;
}

export interface LiveMarkdownEditorHandle {
  insert: (type: MarkdownInsertType, options?: { rows?: number; cols?: number }) => void;
}

function openLinkFromEvent(event: MouseEvent, root: HTMLElement) {
  if (event.button !== 0) return false;

  const target = event.target;
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  const link = element?.closest<HTMLAnchorElement>('a[href]');

  if (!link || !root.contains(link)) return false;

  event.preventDefault();
  window.open(link.href, link.target || '_blank');
  return true;
}

function openModifiedClickedLink(event: Event, root: HTMLElement) {
  if (!(event instanceof MouseEvent) || !event.ctrlKey) return false;
  return openLinkFromEvent(event, root);
}

function openDoubleClickedLink(event: Event, root: HTMLElement) {
  if (!(event instanceof MouseEvent)) return false;
  return openLinkFromEvent(event, root);
}

function shouldAutoLink(value: string) {
  if (/^mailto:/i.test(value)) return false;
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) return false;

  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const hasMaybeProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value);

  if (hasProtocol || (hasMaybeProtocol && !value.includes('@'))) return true;

  const urlWithoutUserinfo = value.includes('@') ? value.split('@').pop() ?? value : value;
  const hostname = urlWithoutUserinfo.split(/[/?#:]/)[0];

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  return /\./.test(hostname);
}

function isPlainEmail(value: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

function decodeUriComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function plainTextFromTokens(tokens: MarkdownToken[] | undefined): string {
  return (tokens ?? [])
    .map((token) => {
      const text = 'text' in token && typeof token.text === 'string' ? token.text : '';
      return text || plainTextFromTokens('tokens' in token ? token.tokens : undefined);
    })
    .join('');
}

function parseLinkMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers): JSONContent | JSONContent[] {
  const href = 'href' in token && typeof token.href === 'string' ? token.href : '';
  const tokens = 'tokens' in token ? token.tokens ?? [] : [];
  const label = plainTextFromTokens(tokens);
  const mailtoPrefix = 'mailto:';

  if (href.toLowerCase().startsWith(mailtoPrefix)) {
    const email = decodeUriComponentSafe(href.slice(mailtoPrefix.length));
    if (label === email && isPlainEmail(label)) {
      return helpers.parseInline(tokens);
    }
  }

  return helpers.applyMark('link', helpers.parseInline(tokens), {
    href,
    title: 'title' in token ? token.title || null : null,
  });
}

const PlainEmailAwareLink = Link.extend({
  parseMarkdown: parseLinkMarkdown,
});

function getUsableEditor(editor: Editor | null): Editor | null {
  return editor && !editor.isDestroyed ? editor : null;
}

function applyInsert(
  type: MarkdownInsertType,
  editor: NonNullable<ReturnType<typeof useEditor>>,
  options?: { rows?: number; cols?: number },
) {
  const chain = editor.chain().focus();

  switch (type) {
    case 'heading2':
      chain.toggleHeading({ level: 2 }).run();
      return;
    case 'heading3':
      chain.toggleHeading({ level: 3 }).run();
      return;
    case 'bold':
      chain.toggleBold().run();
      return;
    case 'italic':
      chain.toggleItalic().run();
      return;
    case 'bulletList':
      chain.toggleBulletList().run();
      return;
    case 'orderedList':
      chain.toggleOrderedList().run();
      return;
    case 'blockquote':
      chain.toggleBlockquote().run();
      return;
    case 'codeBlock':
      chain.toggleCodeBlock().run();
      return;
    case 'link':
      chain
        .insertContent({
          type: 'text',
          text: '链接文字',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        })
        .run();
      return;
    case 'table':
      chain
        .insertTable({
          rows: options?.rows ?? 3,
          cols: options?.cols ?? 3,
          withHeaderRow: true,
        })
        .run();
      return;
    case 'divider':
      chain.setHorizontalRule().run();
      return;
    case 'clearFormat':
      chain.unsetAllMarks().clearNodes().run();
      return;
  }
}

const LiveMarkdownEditor = forwardRef<LiveMarkdownEditorHandle, LiveMarkdownEditorProps>(
  function LiveMarkdownEditor({ content, noteId, onUpdate, onBlur }, ref) {
    const isSyncingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor(
      {
        extensions: [
          StarterKit.configure({
            link: false,
          }),
          PlainEmailAwareLink.configure({
            autolink: true,
            linkOnPaste: true,
            openOnClick: false,
            shouldAutoLink,
            HTMLAttributes: {
              class: 'markdown-link',
            },
          }),
          Table.configure({
            resizable: true,
            handleWidth: 10,
            cellMinWidth: 72,
            lastColumnResizable: true,
          }),
          TableRow,
          TableHeader,
          TableCell,
          Placeholder.configure({
            placeholder: '直接输入内容，所见即所得',
          }),
          Markdown,
        ],
        editable: true,
        content,
        contentType: 'markdown',
        onUpdate: ({ editor: currentEditor }) => {
          if (isSyncingRef.current) return;
          onUpdate(currentEditor.getMarkdown());
        },
        onBlur: () => onBlur?.(),
        editorProps: {
          attributes: {
            class: 'markdown-preview focus:outline-none p-5 min-h-full text-left',
          },
          handleDOMEvents: {
            click: (view, event) => openModifiedClickedLink(event, view.dom),
            dblclick: (view, event) => openDoubleClickedLink(event, view.dom),
          },
        },
      },
      [noteId],
    );

    useImperativeHandle(
      ref,
      () => ({
        insert(type, options) {
          const usableEditor = getUsableEditor(editor);
          if (!usableEditor) return;
          applyInsert(type, usableEditor, options);
        },
      }),
      [editor],
    );

    useEffect(() => {
      const usableEditor = getUsableEditor(editor);
      if (!usableEditor) return;
      usableEditor.commands.fixTables();
    }, [editor]);

    useEffect(() => {
      const usableEditor = getUsableEditor(editor);
      if (!usableEditor) return;
      const current = usableEditor.getMarkdown();
      if (content !== current) {
        isSyncingRef.current = true;
        try {
          usableEditor.commands.setContent(content, { contentType: 'markdown' });
          usableEditor.commands.fixTables();
        } finally {
          isSyncingRef.current = false;
        }
      }
    }, [content, editor]);

    const usableEditor = getUsableEditor(editor);

    if (!usableEditor) {
      return <div className="p-5 text-[13px] text-[var(--color-text-secondary)]">加载编辑器...</div>;
    }

    return (
      <div ref={containerRef} className="relative flex-1 overflow-y-auto h-full min-h-[280px]">
        <EditorContent
          editor={usableEditor}
          className="h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none"
        />
        <TableDimensionHandle editor={usableEditor} containerRef={containerRef} />
      </div>
    );
  },
);

export default LiveMarkdownEditor;
