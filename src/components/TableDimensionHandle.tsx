import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getActiveTable, getTableWrapperElement, resizeTable } from '../lib/tableUtils';

interface TableDimensionHandleProps {
  editor: Editor;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface TableLayout {
  top: number;
  left: number;
  width: number;
  height: number;
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
}

export default function TableDimensionHandle({ editor, containerRef }: TableDimensionHandleProps) {
  const [layout, setLayout] = useState<TableLayout | null>(null);
  const [preview, setPreview] = useState<{ rows: number; cols: number } | null>(null);
  const layoutRef = useRef<TableLayout | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const updateLayout = () => {
      const info = getActiveTable(editor);
      const container = containerRef.current;
      if (!info || !container) {
        setLayout(null);
        return;
      }

      const wrapper = getTableWrapperElement(editor, info.pos);
      const table = wrapper?.querySelector('table');
      const firstCell = table?.querySelector('th, td');
      if (!wrapper || !table || !firstCell) {
        setLayout(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();

      setLayout({
        top: wrapperRect.top - containerRect.top + container.scrollTop,
        left: wrapperRect.left - containerRect.left + container.scrollLeft,
        width: wrapperRect.width,
        height: wrapperRect.height,
        rows: info.rows,
        cols: info.cols,
        cellWidth: firstCell.getBoundingClientRect().width,
        cellHeight: firstCell.getBoundingClientRect().height || 40,
      });
    };

    updateLayout();
    editor.on('selectionUpdate', updateLayout);
    editor.on('transaction', updateLayout);
    containerRef.current?.addEventListener('scroll', updateLayout);
    window.addEventListener('resize', updateLayout);

    return () => {
      editor.off('selectionUpdate', updateLayout);
      editor.off('transaction', updateLayout);
      containerRef.current?.removeEventListener('scroll', updateLayout);
      window.removeEventListener('resize', updateLayout);
    };
  }, [editor, containerRef]);

  if (!layout) return null;

  const displayRows = preview?.rows ?? layout.rows;
  const displayCols = preview?.cols ?? layout.cols;
  const previewWidth = layout.cellWidth * displayCols;
  const previewHeight = layout.cellHeight * displayRows;

  const startDrag = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const startLayout = layoutRef.current;
    if (!startLayout) return;

    const start = {
      startX: event.clientX,
      startY: event.clientY,
      rows: startLayout.rows,
      cols: startLayout.cols,
      cellWidth: startLayout.cellWidth,
      cellHeight: startLayout.cellHeight,
    };

    setPreview({ rows: start.rows, cols: start.cols });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextCols = Math.max(
        1,
        Math.min(20, start.cols + Math.round((moveEvent.clientX - start.startX) / start.cellWidth)),
      );
      const nextRows = Math.max(
        1,
        Math.min(20, start.rows + Math.round((moveEvent.clientY - start.startY) / start.cellHeight)),
      );
      setPreview({ rows: nextRows, cols: nextCols });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const nextCols = Math.max(
        1,
        Math.min(20, start.cols + Math.round((upEvent.clientX - start.startX) / start.cellWidth)),
      );
      const nextRows = Math.max(
        1,
        Math.min(20, start.rows + Math.round((upEvent.clientY - start.startY) / start.cellHeight)),
      );

      if (nextRows !== start.rows || nextCols !== start.cols) {
        resizeTable(editor, nextRows, nextCols);
      }

      setPreview(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="table-dimension-layer pointer-events-none absolute inset-0">
      {preview && (
        <div
          className="table-dimension-preview"
          style={{
            top: layout.top,
            left: layout.left,
            width: previewWidth,
            height: previewHeight,
          }}
        >
          <div
            className="table-dimension-preview__grid"
            style={{
              gridTemplateColumns: `repeat(${displayCols}, ${layout.cellWidth}px)`,
              gridTemplateRows: `repeat(${displayRows}, ${layout.cellHeight}px)`,
            }}
          >
            {Array.from({ length: displayRows * displayCols }, (_, index) => {
              const row = Math.floor(index / displayCols);
              const col = index % displayCols;
              const isNew = row >= layout.rows || col >= layout.cols;
              return <div key={index} className={isNew ? 'is-new' : 'is-current'} />;
            })}
          </div>
          <div className="table-dimension-preview__label">
            {displayRows} × {displayCols}
          </div>
        </div>
      )}

      <button
        type="button"
        className="table-dimension-handle pointer-events-auto"
        title="拖动调整表格行列"
        style={{
          top: layout.top + layout.height - 6,
          left: layout.left + layout.width - 6,
        }}
        onMouseDown={startDrag}
      />
    </div>
  );
}
