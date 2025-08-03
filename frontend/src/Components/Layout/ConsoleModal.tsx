import React from 'react';
import Console from './Console';

interface ConsoleModalProps {
  isOpen: boolean;
  closeModal: () => void;
  node: string;
  vmid: number;
  backendUrl: string;
  auth: { ticket: string; csrf_token: string };
  addAlert: (message: string, type: string) => void;
}

const ConsoleModal: React.FC<ConsoleModalProps> = ({ isOpen, closeModal, node, vmid, backendUrl, auth, addAlert }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    closeModal();
    addAlert(`Console closed for VM ${vmid}`, 'info');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded-lg w-3/4 h-3/4">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl">Console for VM {vmid}</h2>
          <button 
            onClick={handleClose}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
        <Console node={node} vmid={vmid} backendUrl={backendUrl} auth={auth} />
      </div>
    </div>
  );
};

export default ConsoleModal;