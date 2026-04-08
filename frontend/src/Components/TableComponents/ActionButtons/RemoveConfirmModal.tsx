import { useState, useEffect, useRef } from 'react';

interface RemoveConfirmModalProps {
  vmName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const RemoveConfirmModal = ({ vmName, onConfirm, onCancel }: RemoveConfirmModalProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = inputValue === vmName;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && matches) onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Remove Virtual Machine</h3>
            <p className="text-xs text-gray-500 mt-0.5">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        {/* Instruction */}
        <p className="text-sm text-gray-700 mb-3">
          Type <span className="font-mono font-semibold text-red-600 bg-red-50 px-1 rounded">{vmName}</span> to confirm removal.
        </p>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={vmName}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors focus:outline-none focus:ring-2
            ${matches
              ? 'border-red-400 focus:ring-red-400/30 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-400'
            }`}
        />

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Remove VM
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveConfirmModal;
