import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { Code2, Sparkles } from 'lucide-react';
import { contentToMarkdown } from '../lib/markdownContent';
import LiveMarkdownEditor from './LiveMarkdownEditor';

interface MarkdownEditorProps {
  content: unknown;
  noteId: string;
  onUpdate: (markdown: string) => void;
  onBlur?: () => void;
}

type ViewMode = 'source' | 'live';

const darkEditorTheme = EditorView.theme(
  {
    '.cm-content': {
      textAlign: 'left',
    },
    '.cm-line': {
      textAlign: 'left',
    },
  },
  { dark: true },
);

const lightEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    '.cm-content': {
      padding: '16px',
      fontSize: '14px',
      lineHeight: '1.7',
      caretColor: '#18181b',
      textAlign: 'left',
    },
    '.cm-line': {
      textAlign: 'left',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#a1a1aa',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: false },
);

export default function MarkdownEditor({ content, noteId, onUpdate, onBlur }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onUpdateRef = useRef(onUpdate);
  const onBlurRef = useRef(onBlur);
  const markdownTextRef = useRef(contentToMarkdown(content));
  const [viewMode, setViewMode] = useState<ViewMode>('source');
  const [markdownText, setMarkdownText] = useState(() => contentToMarkdown(content));
  const [isDark, setIsDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  onUpdateRef.current = onUpdate;
  onBlurRef.current = onBlur;

  const syncMarkdown = (text: string) => {
    markdownTextRef.current = text;
    setMarkdownText(text);
    onUpdateRef.current(text);
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setIsDark(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const text = contentToMarkdown(content);
    markdownTextRef.current = text;
    setMarkdownText(text);
    setViewMode('source');
  }, [noteId]);

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
        placeholder('输入 Markdown 笔记...\n\n支持 **粗体**、*斜体*、# 标题、- 列表、```代码块```'),
        EditorView.lineWrapping,
        isDark ? [oneDark, darkEditorTheme] : lightEditorTheme,
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
  }, [noteId, isDark, viewMode]);

  useEffect(() => {
    if (!viewRef.current || viewMode !== 'source') return;

    const newDoc = contentToMarkdown(content);
    const currentDoc = viewRef.current.state.doc.toString();

    if (newDoc !== currentDoc) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
      });
      markdownTextRef.current = newDoc;
      setMarkdownText(newDoc);
    }
  }, [content, viewMode]);

  const modeButtonClass = (mode: ViewMode) =>
    `flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
      viewMode === mode
        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 flex flex-col h-full min-h-[320px] overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800">
        <button type="button" onClick={() => setViewMode('source')} className={modeButtonClass('source')}>
          <Code2 className="w-3.5 h-3.5" />
          源码
        </button>
        <button type="button" onClick={() => setViewMode('live')} className={modeButtonClass('live')}>
          <Sparkles className="w-3.5 h-3.5" />
          实时渲染
        </button>
      </div>

      {viewMode === 'source' ? (
        <div ref={editorRef} className="flex-1 overflow-hidden" />
      ) : (
        <LiveMarkdownEditor
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
