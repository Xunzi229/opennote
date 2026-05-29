import type { Editor } from '@tiptap/react';

export interface ActiveTableInfo {
  node: { childCount: number; child: (index: number) => { childCount: number; nodeSize: number } };
  pos: number;
  rows: number;
  cols: number;
}

export function getActiveTable(editor: Editor): ActiveTableInfo | null {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      return getTableAtPos(editor, $from.before(depth));
    }
  }

  return null;
}

export function getTableAtPos(editor: Editor, tablePos: number): ActiveTableInfo | null {
  const node = editor.state.doc.nodeAt(tablePos);
  if (!node || node.type.name !== 'table') return null;

  return {
    node,
    pos: tablePos,
    rows: node.childCount,
    cols: node.childCount > 0 ? node.child(0).childCount : 0,
  };
}

export function getTableWrapperElement(editor: Editor, tablePos: number): HTMLElement | null {
  const dom = editor.view.nodeDOM(tablePos);
  if (!(dom instanceof HTMLElement)) return null;
  if (dom.classList.contains('tableWrapper')) return dom;
  return dom.querySelector('.tableWrapper') ?? dom.closest('.tableWrapper');
}

function getCellPos(editor: Editor, tablePos: number, row: number, col: number): number | null {
  const table = editor.state.doc.nodeAt(tablePos);
  if (!table || row < 0 || row >= table.childCount) return null;

  let pos = tablePos + 1;
  for (let r = 0; r < row; r++) {
    pos += table.child(r).nodeSize;
  }

  const rowNode = table.child(row);
  if (col < 0 || col >= rowNode.childCount) return null;

  pos += 1;
  for (let c = 0; c < col; c++) {
    pos += rowNode.child(c).nodeSize;
  }

  return pos;
}

function getSelectionPosInCell(editor: Editor, cellPos: number): number | null {
  const cell = editor.state.doc.nodeAt(cellPos);
  if (!cell) return null;

  let pos = cellPos + 1;
  const firstChild = cell.firstChild;
  if (firstChild?.isTextblock) {
    pos += 1;
  }

  return pos;
}

function selectTableCell(editor: Editor, tablePos: number, row: number, col: number) {
  const cellPos = getCellPos(editor, tablePos, row, col);
  if (cellPos === null) return false;

  const textPos = getSelectionPosInCell(editor, cellPos);
  if (textPos === null) return false;

  try {
    return editor.chain().focus().setTextSelection(textPos).run();
  } catch {
    return false;
  }
}

export function resizeTable(editor: Editor, targetRows: number, targetCols: number) {
  const maxSize = 20;
  targetRows = Math.max(1, Math.min(maxSize, targetRows));
  targetCols = Math.max(1, Math.min(maxSize, targetCols));

  const initial = getActiveTable(editor);
  if (!initial) return;

  const tablePos = initial.pos;

  while (true) {
    const info = getTableAtPos(editor, tablePos);
    if (!info || info.cols >= targetCols) break;
    if (!selectTableCell(editor, tablePos, 0, info.cols - 1)) break;
    if (!editor.chain().focus().addColumnAfter().run()) break;
  }

  while (true) {
    const info = getTableAtPos(editor, tablePos);
    if (!info || info.cols <= targetCols) break;
    if (!selectTableCell(editor, tablePos, 0, info.cols - 1)) break;
    if (!editor.chain().focus().deleteColumn().run()) break;
  }

  while (true) {
    const info = getTableAtPos(editor, tablePos);
    if (!info || info.rows >= targetRows) break;
    if (!selectTableCell(editor, tablePos, info.rows - 1, 0)) break;
    if (!editor.chain().focus().addRowAfter().run()) break;
  }

  while (true) {
    const info = getTableAtPos(editor, tablePos);
    if (!info || info.rows <= targetRows) break;
    if (!selectTableCell(editor, tablePos, info.rows - 1, 0)) break;
    if (!editor.chain().focus().deleteRow().run()) break;
  }

  const finalInfo = getTableAtPos(editor, tablePos);
  if (finalInfo) {
    selectTableCell(
      editor,
      tablePos,
      Math.min(finalInfo.rows - 1, targetRows - 1),
      Math.min(finalInfo.cols - 1, targetCols - 1),
    );
  }
}

export function buildTableMarkdown(rows: number, cols: number) {
  const headerCells = Array.from({ length: cols }, (_, index) => `列${index + 1}`);
  const lines = [
    `| ${headerCells.join(' | ')} |`,
    `| ${Array(cols).fill('---').join(' | ')} |`,
  ];

  for (let row = 0; row < rows - 1; row++) {
    lines.push(`| ${Array(cols).fill('内容').join(' | ')} |`);
  }

  return `\n${lines.join('\n')}\n`;
}
