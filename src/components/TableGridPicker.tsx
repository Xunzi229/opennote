import { useEffect, useRef, useState } from 'react';
import { Table } from 'lucide-react';
import { t } from '../i18n';

interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  disabled?: boolean;
}

const MAX_ROWS = 8;
const MAX_COLS = 10;

export default function TableGridPicker({ onSelect, disabled }: TableGridPickerProps) {
  const [open, setOpen] = useState(false);
  const [hoverSize, setHoverSize] = useState({ rows: 0, cols: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHoverSize({ rows: 0, cols: 0 });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (rows: number, cols: number) => {
    onSelect(rows, cols);
    setOpen(false);
    setHoverSize({ rows: 0, cols: 0 });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={t('insertTable')}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="btn btn-ghost btn-icon !w-8 !h-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <Table className="w-4 h-4" />
      </button>

      {open && (
        <div className="table-grid-picker">
          <div className="table-grid-picker__label">
            {hoverSize.rows > 0 ? `${hoverSize.rows} × ${hoverSize.cols}` : t('chooseTableSize')}
          </div>
          <div
            className="table-grid-picker__grid"
            onMouseLeave={() => setHoverSize({ rows: 0, cols: 0 })}
          >
            {Array.from({ length: MAX_ROWS }, (_, rowIndex) =>
              Array.from({ length: MAX_COLS }, (_, colIndex) => {
                const rows = rowIndex + 1;
                const cols = colIndex + 1;
                const active = rows <= hoverSize.rows && cols <= hoverSize.cols;

                return (
                  <button
                    key={`${rows}-${cols}`}
                    type="button"
                    className={`table-grid-picker__cell ${active ? 'is-active' : ''}`}
                    onMouseEnter={() => setHoverSize({ rows, cols })}
                    onClick={() => handleSelect(rows, cols)}
                  />
                );
              }),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
