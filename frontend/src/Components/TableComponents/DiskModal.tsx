import { useState, useEffect } from 'react';
import { VM, Auth, VMStatus } from '../../types';
import axios from 'axios';

interface DiskModalProps {
  vm: VM;
  isOpen: boolean;
  onClose: () => void;
  node: string;
  auth: Auth;
  addAlert: (message: string, type: 'success' | 'error') => void;
  refreshVMs: () => void;
}

interface VMStatusResponse {
  status: VMStatus;
}

interface AddDiskResponse {
  success?: boolean;
  data?: any;
  message?: string;
}

interface ActivateUnusedDiskResponse {
  success: boolean;
  message: string;
  target_key: string;
  data?: any;
}

const DiskModal = ({ vm, isOpen, onClose, node, auth, addAlert, refreshVMs }: DiskModalProps) => {
  const [size, setSize] = useState<number>(10);
  const [controller, setController] = useState<'scsi' | 'sata' | 'virtio'>('scsi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vmWasRunning, setVmWasRunning] = useState(false);

  const getUsedBusNumbers = (): number[] => {
    const config = vm.config;
    if (!config) return [];
    const used: number[] = [];

    for (const key of Object.keys(config)) {
      if (key.startsWith(controller)) {
        const match = key.match(/\d+$/);
        if (match) used.push(Number(match[0]));
      }
    }

    return used;
  };

  const findNextFreeBus = (): number => {
    const used = getUsedBusNumbers();
    let i = 0;
    while (used.includes(i)) i++;
    return i;
  };

  const getVMStatus = async (): Promise<VMStatus> => {
    try {
      const response = await axios.get<VMStatusResponse>(
        `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/status`,
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
          },
        }
      );
      return response.data.status;
    } catch (error) {
      console.error('Failed to get VM status:', error);
      return 'stopped';
    }
  };

  const controlVM = async (action: string): Promise<void> => {
    await axios.post(
      `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/${action}`,
      {},
      {
        params: {
          csrf_token: auth.csrf_token,
          ticket: auth.ticket,
        },
      }
    );
  };

  const waitForVMStatus = async (targetStatus: VMStatus, timeout = 30000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await getVMStatus();
      if (status === targetStatus) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
  };

  useEffect(() => {
    if (isOpen) {
      setSize(10);
      setController('scsi');
      setError(null);
      setVmWasRunning(false);
    }
  }, [isOpen, vm.vmid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (size > 80) {
      setError('Maximum disk size is 80 GB.');
      return;
    }

    setLoading(true);

    try {
      const currentStatus = await getVMStatus();
      if (currentStatus === 'running') {
        setVmWasRunning(true);
        addAlert(`Stopping VM ${vm.vmid} to add disk...`, 'success');
        await controlVM('shutdown');
        const stopped = await waitForVMStatus('stopped');
        if (!stopped) throw new Error('Failed to stop VM within timeout period');
        addAlert(`VM ${vm.vmid} stopped successfully`, 'success');
      }

      const bus = findNextFreeBus();

      const diskRequestBody = {
        controller,
        bus,
        size,
        storage: 'vmstorage',
        format: 'qcow2',
      };

      await axios.post<AddDiskResponse>(
        `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/add-disk`,
        diskRequestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
          },
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const configResp = await axios.get<{ config: VM['config'] }>(
        `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/config`,
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
          },
        }
      );

      const config = configResp.data.config || {};
      const unusedKey = Object.entries(config).find(
        ([k, v]) =>
          k.startsWith('unused') &&
          typeof v === 'string' &&
          v.includes(`vm-${vm.vmid}-disk-${bus}`)
      )?.[0];

      if (unusedKey) {
        const activateResponse = await axios.post<ActivateUnusedDiskResponse>(
          `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/activate-unused-disk/${unusedKey}`,
          {},
          {
            params: {
              csrf_token: auth.csrf_token,
              ticket: auth.ticket,
              target_controller: controller,
            },
          }
        );

        if (activateResponse.data.success) {
          addAlert(`Disk activated on VM ${vm.vmid} as ${activateResponse.data.target_key}`, 'success');
        } else {
          addAlert(`Disk created but not activated: ${unusedKey}`, 'error');
        }
      } else {
        addAlert(`Disk created on VM ${vm.vmid} (attached directly or no matching unused entry found).`, 'success');
      }

      if (vmWasRunning) {
        addAlert(`Starting VM ${vm.vmid}...`, 'success');
        await controlVM('start');
        await waitForVMStatus('running');
        addAlert(`VM ${vm.vmid} started successfully`, 'success');
      }

      refreshVMs(); // ✅ Refresh disk data in UI

      onClose();
    } catch (err: any) {
      console.error('Error adding disk:', err);
      if (vmWasRunning) {
        try {
          await controlVM('start');
          addAlert(`VM ${vm.vmid} restarted after error`, 'success');
        } catch {
          addAlert(`Failed to restart VM ${vm.vmid}`, 'error');
        }
      }
      addAlert(`Failed to add disk: ${JSON.stringify(err.response?.data) || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Disk</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> The VM will be temporarily stopped to add the disk, then restarted if it was running.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white">Size (GB)</label>
            <select
              value={size}
              onChange={e => setSize(+e.target.value)}
              className="mt-1 block w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {[2, 4, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(v => (
                <option key={v} value={v}>{v} GB</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white">Controller</label>
            <select
              value={controller}
              onChange={e => setController(e.target.value as any)}
              className="mt-1 block w-full h-[38px] rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="scsi">SCSI</option>
              <option value="sata">SATA</option>
              <option value="virtio">VirtIO</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? 'Adding Disk...' : 'Add Disk'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DiskModal;
