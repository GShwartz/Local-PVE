// src/components/VM/DiskModal/DiskExpandModal.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import ModalWrapper from './ModalWrapper';
import DiskForm from './DiskForm';
import { VM, Auth } from '../../../../types';

interface DiskExpandModalProps {
  vm: VM;
  node: string;
  auth: Auth;
  diskKey: string;
  currentSize: number; // in GB
  isOpen: boolean;
  onClose: () => void;
  addAlert: (msg: string, type: 'success' | 'error' | 'info') => void;
  refreshConfig: () => void;
}

const ALL_SIZES = [10, 20, 30, 40, 50, 60, 70, 80];

const DiskExpandModal = ({
  vm,
  node,
  auth,
  diskKey,
  currentSize,
  isOpen,
  onClose,
  addAlert,
  refreshConfig
}: DiskExpandModalProps) => {
  // Build the available sizes based on the current size
  const availableSizes = ALL_SIZES.filter(s => s > currentSize);

  // Default to the first valid option
  const [size, setSize] = useState<number>(availableSizes[0] || currentSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSize(availableSizes[0] || currentSize);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (size <= currentSize) {
      setError('New size must be greater than current size.');
      return;
    }
    if (size > 80) {
      setError('Maximum disk size is 80 GB.');
      return;
    }

    setLoading(true);

    try {
      addAlert(`Expanding ${diskKey} from ${currentSize}GB to ${size}GB...`, 'info');

      await axios.post(
        `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}/expand`,
        { new_size: size },
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket
          },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      addAlert(`✅ Disk ${diskKey} expanded to ${size}GB successfully.`, 'success');
      refreshConfig();
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      addAlert(`❌ Failed to expand disk ${diskKey}: ${detail}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper title={`Expand Disk ${diskKey}`} onClose={onClose}>
      <DiskForm
        size={size}
        setSize={setSize}
        handleSubmit={handleSubmit}
        error={error}
        loading={loading}
        sizeOptions={availableSizes}
        submitLabel="Expand Disk"
      />
    </ModalWrapper>
  );
};

export default DiskExpandModal;
