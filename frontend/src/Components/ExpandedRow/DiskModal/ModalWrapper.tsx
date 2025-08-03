import React from 'react';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper = ({ title, onClose, children }: ModalWrapperProps) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
      </div>
      {children}
    </div>
  </div>
);

export default ModalWrapper;
