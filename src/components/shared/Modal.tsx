import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(13, 14, 17, 0.88)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-full ${maxWidth} bg-ledger-surface-high rounded-sm max-h-[90vh] flex flex-col`}
        style={{ boxShadow: '0 0 0 1px rgba(233,193,118,0.08), 0 0 32px rgba(233,193,118,0.06), 0 24px 64px rgba(0,0,0,0.6)' }}
      >
        {/* Header — tonal shift (no border line) */}
        <div className="flex items-center justify-between px-6 py-4 bg-ledger-surface-highest rounded-t-sm flex-shrink-0">
          <h2 className="font-serif font-semibold text-ledger-text text-base tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-ledger-text-muted hover:text-ledger-text transition-colors p-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => (
  <Modal open title="Confirm" onClose={onCancel} maxWidth="max-w-sm">
    <p className="font-sans text-ledger-text-dim text-sm mb-6 leading-relaxed">{message}</p>
    <div className="flex gap-3 justify-end">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-sm text-sm font-sans font-medium text-ledger-text-dim
                   bg-ledger-surface hover:bg-ledger-surface-high transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={() => { onConfirm(); onCancel(); }}
        className="px-4 py-2 rounded-sm text-sm font-sans font-semibold
                   bg-ledger-error/80 hover:bg-ledger-error text-ledger-text transition-colors"
      >
        Confirm
      </button>
    </div>
  </Modal>
);
