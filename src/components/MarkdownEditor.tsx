import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { Code2, Sparkles } from 'lucide-react';
import { contentToMarkdown } from '../lib/markdownContent';
import { insertMarkdownSnippet, insertTableMarkdown } from '../lib/markdownInsert';
import type { MarkdownInsertType } from '../lib/markdownInsertTypes';
import LiveMarkdownEditor, { type LiveMarkdownEditorHandle } from './LiveMarkdownEditor';
import MarkdownToolbar from './MarkdownToolbar';
import { t } from '../i18n';

interface MarkdownEditorProps {
  content: unknown;
  noteId: string;
  onUpdate: (markdown: string) => void;
  onBlur?: () => void;
}

type ViewMode = 'source' | 'live';

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    padding: '20px 16px',
    fontSize: '14px',
    lineHeight: '1.75',
    caretColor: 'var(--color-text)',
    textAlign: 'left',
  },
  '.cm-line': {
    textAlign: 'left',
  },
  '.cm-gutters': {
    backgroundColor: '#fafafa',
    borderRight: '1px solid var(--color-border)',
    color: '#94a3b8',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

export default function MarkdownEditor({ content, noteId, onUpdate, onBlur }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const liveEditorRef = useRef<LiveMarkdownEditorHandle>(null);
  const onUpdateRef = useRef(onUpdate);
  const onBlurRef = useRef(onBlur);
  const markdownTextRef = useRef(contentToMarkdown(content));
  const isExternalUpdateRef = useRef(false);
  const [viewMode, setViewMode] = useState<ViewMode>('live');
  const [markdownText, setMarkdownText] = useState(() => contentToMarkdown(content));

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onBlurRef.current = onBlur;
  }, [onUpdate, onBlur]);

  const syncMarkdown = (text: string, fromExternal = false) => {
    markdownTextRef.current = text;
    setMarkdownText(text);
    if (!fromExternal && !isExternalUpdateRef.current) {
      onUpdateRef.current(text);
    }
  };

  useEffect(() => {
    const newDoc = contentToMarkdown(content);
    if (newDoc === markdownTextRef.current) return;

    isExternalUpdateRef.current = true;
    syncMarkdown(newDoc, true);
    isExternalUpdateRef.current = false;
  }, [content]);

  useEffect(() => {
    if (viewMode !== 'source' || !editorRef.current) return;

    const state = EditorState.create({
      doc: markdownTextRef.current,
      extensions: [
        history(),
        lineNumbers(),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        placeholder(t('editorPlaceholder')),
        EditorView.lineWrapping,
        editorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            syncMarkdown(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          blur: () => onBlurRef.current?.(),
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
      viewRef.current = null;
    };
  }, [noteId, viewMode]);

  useEffect(() => {
    if (!viewRef.current || viewMode !== 'source') return;

    const newDoc = contentToMarkdown(content);
    const currentDoc = viewRef.current.state.doc.toString();

    if (newDoc !== currentDoc) {
      isExternalUpdateRef.current = true;
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
      });
      syncMarkdown(newDoc, true);
      isExternalUpdateRef.current = false;
    }
  }, [content, viewMode]);

  const modeButtonClass = (mode: ViewMode) =>
    `btn ${viewMode === mode ? 'btn-primary' : 'btn-secondary'} !h-8 !px-3 !text-[12px]`;

  const handleInsert = (type: MarkdownInsertType) => {
    if (viewMode === 'source') {
      if (viewRef.current) {
        insertMarkdownSnippet(viewRef.current, type);
      }
      return;
    }

    liveEditorRef.current?.insert(type);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (viewMode === 'source') {
      if (viewRef.current) {
        insertTableMarkdown(viewRef.current, rows, cols);
      }
      return;
    }

    liveEditorRef.current?.insert('table', { rows, cols });
  };

  return (
    <div className="editor-shell flex flex-col h-full overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={() => setViewMode('source')} className={modeButtonClass('source')}>
            <Code2 className="w-3.5 h-3.5" />
            {t('edit')}
          </button>
          <button type="button" onClick={() => setViewMode('live')} className={modeButtonClass('live')}>
            <Sparkles className="w-3.5 h-3.5" />
            {t('livePreview')}
          </button>
        </div>
        <MarkdownToolbar onInsert={handleInsert} onInsertTable={handleInsertTable} />
      </div>

      {viewMode === 'source' ? (
        <div ref={editorRef} className="flex-1 overflow-hidden min-h-[280px]" />
      ) : (
        <LiveMarkdownEditor
          ref={liveEditorRef}
          key={`${noteId}-${viewMode}`}
          noteId={noteId}
          content={markdownText}
          onUpdate={syncMarkdown}
          onBlur={onBlur}
        />
      )}
    </div>
  );
}
