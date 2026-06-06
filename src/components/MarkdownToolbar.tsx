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
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
      <div className="toolbar-group">
        {TOOLBAR_ITEMS.slice(0, 2).map(({ type, labelKey, icon: Icon }) => (
          <button key={type} type="button" title={t(labelKey)} onClick={() => onInsert(type)} className="toolbar-button">
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        {TOOLBAR_ITEMS.slice(2, 4).map(({ type, labelKey, icon: Icon }) => (
          <button key={type} type="button" title={t(labelKey)} onClick={() => onInsert(type)} className="toolbar-button">
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        {TOOLBAR_ITEMS.slice(4, 8).map(({ type, labelKey, icon: Icon }) => (
          <button key={type} type="button" title={t(labelKey)} onClick={() => onInsert(type)} className="toolbar-button">
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <TableGridPicker onSelect={onInsertTable} />
        {TOOLBAR_ITEMS.slice(8).map(({ type, labelKey, icon: Icon }) => (
          <button key={type} type="button" title={t(labelKey)} onClick={() => onInsert(type)} className="toolbar-button">
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
