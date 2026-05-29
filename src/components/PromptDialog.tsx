import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  value: string;
  confirmText?: string;
  cancelText?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PromptDialog({
  isOpen,
  title,
  label,
  placeholder,
  value,
  confirmText = '确定',
  cancelText = '取消',
  onChange,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className="bg-white rounded-[14px] shadow-[var(--shadow-md)] w-full max-w-md mx-4 border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{title}</h3>
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4">
            {label && (
              <label htmlFor="prompt-input" className="block text-[13px] text-[var(--color-text-secondary)] mb-2">
                {label}
              </label>
            )}
            <input
              id="prompt-input"
              ref={inputRef}
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(e.target.value)}
              className="input-field !pl-3"
            />
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              {cancelText}
            </button>
            <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
