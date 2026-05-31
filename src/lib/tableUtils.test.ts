import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { getActiveTable, resizeTable } from './tableUtils';

function createTableEditor(rows = 2, cols = 2) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
  });

  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  return editor;
}

describe('table resizing utilities', () => {
  it('expands a focused table by multiple rows and columns in one resize', () => {
    const editor = createTableEditor(2, 2);

    resizeTable(editor, 5, 5);

    expect(getActiveTable(editor)).toMatchObject({ rows: 5, cols: 5 });
    editor.destroy();
  });
});
