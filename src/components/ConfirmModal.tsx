import React from 'react';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onClose }) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle size={24} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            GHAIRI
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                INACHAKATA...
              </>
            ) : (
              'THIBITISHA'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
