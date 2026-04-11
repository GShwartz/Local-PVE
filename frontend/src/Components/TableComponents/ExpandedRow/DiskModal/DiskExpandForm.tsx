// src/components/TableComponents/ExpandedRow/DiskModal/DiskExpandForm.tsx
import { useState, useEffect } from 'react';
import api from '../../../../api';
import { VM } from '../../../../types';
import styles from '../../../../CSS/ExpandedArea.module.css';

interface DiskExpandFormProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  diskKey: string;
  currentSize: number; // in GB
  onClose: () => void;
  addAlert: (msg: string, type: 'success' | 'error' | 'info') => void;
  refreshConfig: () => void;
  setPendingDiskKey: (key: string | null) => void;
}

const ALL_SIZES = [10, 20, 30, 40, 50, 60, 70, 80];

const DiskExpandForm = ({
  vm,
  node,
  auth,
  diskKey,
  currentSize,
  onClose,
  addAlert,
  refreshConfig,
  setPendingDiskKey
}: DiskExpandFormProps) => {
  // Build the available sizes based on the current size
  const availableSizes = ALL_SIZES.filter(s => s > currentSize);

  // Default to the first valid option
  const [size, setSize] = useState<number>(availableSizes[0] || currentSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSize(availableSizes[0] || currentSize);
    setError(null);
  }, [currentSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (size <= currentSize) {
      setError('New size must be larger than current size');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, check VM status and shutdown if running
      if (vm.status === 'running') {
        addAlert(`VM ${vm.vmid} is running. Shutting down before disk expansion...`, 'info');
        await api.post(`/vm/${node}/qemu/${vm.vmid}/shutdown`);

        // Wait for shutdown
        let attempts = 0;
        while (attempts < 30) { // 30 attempts = 30 seconds
          try {
            const statusRes = await api.get<{ status: string }>(`/vm/${node}/qemu/${vm.vmid}/status`);
            if (statusRes.data.status === 'stopped') break;
          } catch (err) {
            // Ignore errors during status check
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      // Expand the disk
      await api.post(`/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}/expand`, { new_size: size });

      addAlert(`✅ Disk ${diskKey} expanded from ${currentSize}GB to ${size}GB`, 'success');
      await refreshConfig();

      // Restart VM if it was running
      if (vm.status === 'running') {
        addAlert(`Starting VM ${vm.vmid}...`, 'info');
        await api.post(`/vm/${node}/qemu/${vm.vmid}/start`);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      setError(`Failed to expand disk: ${detail}`);
      addAlert(`❌ Failed to expand disk ${diskKey}: ${detail}`, 'error');
    } finally {
      setLoading(false);
      setPendingDiskKey(null);
    }
  };

  if (availableSizes.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg border border-gray-300">
        Disk is already at maximum size (80GB)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">
          Expand to:
        </label>
        <select
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          disabled={loading}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
        >
          {availableSizes.map((s) => (
            <option key={s} value={s}>
              {s}GB
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">(Current: {currentSize}GB)</span>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          disabled={loading}
          className={`${styles.button} ${styles['button-small']} ${loading ? styles['button-disabled'] : styles['button-red']}`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || size <= currentSize}
          className={`${styles.button} ${styles['button-small']} ${loading ? styles['button-disabled'] : styles['button-green']}`}
        >
          {loading ? 'Expanding...' : 'Expand'}
        </button>
      </div>
    </div>
  );
};

export default DiskExpandForm;
