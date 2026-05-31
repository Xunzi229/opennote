import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Minus,
} from 'lucide-react';
import type { MarkdownInsertType } from '../lib/markdownInsertTypes';
import TableGridPicker from './TableGridPicker';

interface MarkdownToolbarProps {
  onInsert: (type: MarkdownInsertType) => void;
  onInsertTable: (rows: number, cols: number) => void;
}

const TOOLBAR_ITEMS: {
  type: MarkdownInsertType;
  label: string;
  icon: typeof Bold;
}[] = [
  { type: 'heading2', label: '二级标题', icon: Heading2 },
  { type: 'heading3', label: '三级标题', icon: Heading3 },
  { type: 'bold', label: '粗体', icon: Bold },
  { type: 'italic', label: '斜体', icon: Italic },
  { type: 'bulletList', label: '无序列表', icon: List },
  { type: 'orderedList', label: '有序列表', icon: ListOrdered },
  { type: 'blockquote', label: '引用', icon: Quote },
  { type: 'codeBlock', label: '代码块', icon: Code },
  { type: 'link', label: '链接', icon: Link2 },
  { type: 'divider', label: '分割线', icon: Minus },
];

export default function MarkdownToolbar({ onInsert, onInsertTable }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {TOOLBAR_ITEMS.slice(0, 8).map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          title={label}
          onClick={() => onInsert(type)}
          className="btn btn-ghost btn-icon !w-8 !h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <TableGridPicker onSelect={onInsertTable} />

      {TOOLBAR_ITEMS.slice(8).map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          title={label}
          onClick={() => onInsert(type)}
          className="btn btn-ghost btn-icon !w-8 !h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
