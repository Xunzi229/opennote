import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

interface MarkdownEditorProps {
  content: any;
  onUpdate: (content: any) => void;
  onBlur?: () => void;
}

export default function MarkdownEditor({ content, onUpdate, onBlur }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Convert ProseMirror JSON to plain text
  const proseToText = (content: any): string => {
    if (typeof content === 'string') return content;
    if (content?.type === 'doc' && content.content) {
      return content.content
        .map((node: any) => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map((c: any) => c.text || '').join('');
          }
          return '';
        })
        .join('\n\n');
    }
    return '';
  };

  // Convert plain text to ProseMirror JSON
  const textToProse = (text: string): any => {
    if (!text.trim()) {
      return { type: 'doc', content: [] };
    }
    return {
      type: 'doc',
      content: text
        .split('\n\n')
        .filter((p) => p.trim())
        .map((paragraph) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraph }],
        })),
    };
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const initialDoc = proseToText(content);

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        keymap.of(defaultKeymap),
        markdown(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newText = update.state.doc.toString();
            const proseContent = textToProse(newText);
            onUpdate(proseContent);
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            onBlur?.();
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Update editor content when prop changes
  useEffect(() => {
    if (!viewRef.current) return;

    const newDoc = proseToText(content);
    const currentDoc = viewRef.current.state.doc.toString();

    if (newDoc !== currentDoc) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
      });
    }
  }, [content]);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 flex flex-col h-full overflow-hidden">
      <div ref={editorRef} className="flex-1 overflow-auto" />
    </div>
  );
}