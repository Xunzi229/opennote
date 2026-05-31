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
import { t, type MessageKey } from '../i18n';

interface MarkdownToolbarProps {
  onInsert: (type: MarkdownInsertType) => void;
  onInsertTable: (rows: number, cols: number) => void;
}

const TOOLBAR_ITEMS: {
  type: MarkdownInsertType;
  labelKey: MessageKey;
  icon: typeof Bold;
}[] = [
  { type: 'heading2', labelKey: 'toolbarHeading2', icon: Heading2 },
  { type: 'heading3', labelKey: 'toolbarHeading3', icon: Heading3 },
  { type: 'bold', labelKey: 'toolbarBold', icon: Bold },
  { type: 'italic', labelKey: 'toolbarItalic', icon: Italic },
  { type: 'bulletList', labelKey: 'toolbarBulletList', icon: List },
  { type: 'orderedList', labelKey: 'toolbarOrderedList', icon: ListOrdered },
  { type: 'blockquote', labelKey: 'toolbarBlockquote', icon: Quote },
  { type: 'codeBlock', labelKey: 'toolbarCodeBlock', icon: Code },
  { type: 'link', labelKey: 'toolbarLink', icon: Link2 },
  { type: 'divider', labelKey: 'toolbarDivider', icon: Minus },
];

export default function MarkdownToolbar({ onInsert, onInsertTable }: MarkdownToolbarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {TOOLBAR_ITEMS.slice(0, 8).map(({ type, labelKey, icon: Icon }) => (
        <button
          key={type}
          type="button"
          title={t(labelKey)}
          onClick={() => onInsert(type)}
          className="btn btn-ghost btn-icon !w-8 !h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      <TableGridPicker onSelect={onInsertTable} />

      {TOOLBAR_ITEMS.slice(8).map(({ type, labelKey, icon: Icon }) => (
        <button
          key={type}
          type="button"
          title={t(labelKey)}
          onClick={() => onInsert(type)}
          className="btn btn-ghost btn-icon !w-8 !h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
