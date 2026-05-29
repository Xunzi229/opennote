import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { useEffect } from 'react';

interface LiveMarkdownEditorProps {
  content: string;
  noteId: string;
  onUpdate: (markdown: string) => void;
  onBlur?: () => void;
}

export default function LiveMarkdownEditor({ content, noteId, onUpdate, onBlur }: LiveMarkdownEditorProps) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        Placeholder.configure({
          placeholder: '直接输入内容，所见即所得。支持 **粗体**、# 标题、- 列表等 Markdown 语法',
        }),
      ],
      content,
      contentType: 'markdown',
      onUpdate: ({ editor: currentEditor }) => {
        onUpdate(currentEditor.getMarkdown());
      },
      onBlur: () => onBlur?.(),
      editorProps: {
        attributes: {
          class: 'markdown-preview focus:outline-none p-4 min-h-full text-left',
        },
      },
    },
    [noteId],
  );

  useEffect(() => {
    if (!editor) return;

    const current = editor.getMarkdown();
    if (content !== current) {
      editor.commands.setContent(content, { contentType: 'markdown' });
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="p-4 text-sm text-zinc-400">加载编辑器...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto h-full">
      <EditorContent editor={editor} className="h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none" />
    </div>
  );
}
