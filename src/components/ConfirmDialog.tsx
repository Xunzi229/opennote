import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className="bg-white rounded-[14px] shadow-[var(--shadow-md)] w-full max-w-md mx-4 border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{title}</h3>
          <button onClick={onCancel} className="btn btn-ghost btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
          <button onClick={onCancel} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${danger ? 'bg-[var(--color-danger)] text-white hover:opacity-90' : 'btn-primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
