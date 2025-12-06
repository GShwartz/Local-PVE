import { useEffect } from 'react';

interface RemoveConfirmModalProps {
  isOpen: boolean;
  vmName: string;
  vmId: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const RemoveConfirmModal = ({
  isOpen,
  vmName,
  vmId,
  onConfirm,
  onCancel,
}: RemoveConfirmModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Confirm Removal</h3>
        </div>

        {/* Warning Icon */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-300 mb-4 text-center">
            Are you sure you want to remove this virtual machine?
          </p>
          <div className="bg-gray-900/50 rounded-md p-3 flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">VM ID:</span>
              <span className="text-white font-medium">{vmId}</span>
            </div>
            <div className="w-px h-4 bg-gray-600"></div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">VM Name:</span>
              <span className="text-white font-medium">{vmName}</span>
            </div>
          </div>
          <p className="text-sm text-red-400 mt-4 text-center">
            ⚠️ This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
          >
            Remove VM
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveConfirmModal;

