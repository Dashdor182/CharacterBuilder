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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      {/* Panel */}
      <div className={`relative w-full ${maxWidth} bg-stone-900 border border-stone-700 rounded-xl shadow-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
          <h2 className="font-bold text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
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
    <p className="text-stone-300 mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-md border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm"
      >
        Cancel
      </button>
      <button
        onClick={() => { onConfirm(); onCancel(); }}
        className="px-4 py-2 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm font-medium"
      >
        Confirm
      </button>
    </div>
  </Modal>
);
