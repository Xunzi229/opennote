import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from '@tiptap/markdown';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import TableDimensionHandle from './TableDimensionHandle';

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
            link: {
              openOnClick: false,
              HTMLAttributes: {
                class: 'markdown-link',
              },
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
        },
      },
      [noteId],
    );

    useImperativeHandle(
      ref,
      () => ({
        insert(type, options) {
          if (!editor) return;
          applyInsert(type, editor, options);
        },
      }),
      [editor],
    );

    useEffect(() => {
      if (!editor) return;
      editor.commands.fixTables();
    }, [editor]);

    useEffect(() => {
      if (!editor) return;
      const current = editor.getMarkdown();
      if (content !== current) {
        isSyncingRef.current = true;
        editor.commands.setContent(content, { contentType: 'markdown' });
        editor.commands.fixTables();
        isSyncingRef.current = false;
      }
    }, [content, editor]);

    if (!editor) {
      return <div className="p-5 text-[13px] text-[var(--color-text-secondary)]">加载编辑器...</div>;
    }

    return (
      <div ref={containerRef} className="relative flex-1 overflow-y-auto h-full min-h-[280px]">
        <EditorContent editor={editor} className="h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none" />
        <TableDimensionHandle editor={editor} containerRef={containerRef} />
      </div>
    );
  },
);

export default LiveMarkdownEditor;
