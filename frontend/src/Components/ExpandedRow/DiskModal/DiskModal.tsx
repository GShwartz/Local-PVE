import { useState, useEffect } from 'react';
import { VM, Auth } from '../../../types';
import axios from 'axios';
import ModalWrapper from './ModalWrapper';
import DiskWarning from './DiskWarning';
import DiskForm from './DiskForm';
import {
  getVMStatus,
  controlVM,
  waitForVMStatus,
  findMatchingUnusedDisk,
  findNextFreeBus,
} from './useDiskHelpers';

interface DiskModalProps {
  vm: VM;
  isOpen: boolean;
  onClose: () => void;
  node: string;
  auth: Auth;
  addAlert: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshVMs: () => void;
  setIsAddingDisk: (adding: boolean) => void;
  refreshConfig: () => void;
}

interface ActivateResponseData {
  success: boolean;
  message: string;
  target_key: string;
}

const DiskModal = ({
  vm,
  isOpen,
  onClose,
  node,
  auth,
  addAlert,
  refreshVMs,
  setIsAddingDisk,
  refreshConfig,
}: DiskModalProps) => {
  const [size, setSize] = useState<number>(5);
  const [controller, setController] = useState<'scsi' | 'sata' | 'virtio'>('scsi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vmWasRunning, setVmWasRunning] = useState(false);

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
    setIsAddingDisk(true);

    try {
      const currentStatus = await getVMStatus(vm.vmid, node, auth);
      console.log('Current VM status:', currentStatus);

      addAlert(`Adding ${size}GB disk to VM ${vm.vmid} on ${controller.toUpperCase()}...`, 'info');

      onClose();

      if (currentStatus === 'running') {
        setVmWasRunning(true);
        addAlert(`Stopping VM ${vm.vmid} to add disk...`, 'success');
        await controlVM('shutdown', vm.vmid, node, auth);
        const stopped = await waitForVMStatus(vm.vmid, node, auth, 'stopped');
        if (!stopped) throw new Error('Failed to stop VM within timeout period');
        addAlert(`VM ${vm.vmid} stopped successfully`, 'success');
      }

      const bus = findNextFreeBus(vm, controller);
      const diskRequestBody = {
        controller,
        bus,
        size,
        storage: 'vmstorage',
        format: 'qcow2',
      };

      console.log('Sending disk request body:', diskRequestBody);

      const addResponse = await axios.post(
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

      console.log('Disk creation response:', addResponse.data);

      const unusedKey = await findMatchingUnusedDisk(vm.vmid, node, auth);
      console.log('Matched unusedKey:', unusedKey);

      if (unusedKey) {
        const activateResponse = await axios.post<ActivateResponseData>(
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

        const data = activateResponse.data;
        console.log('Activation response:', data);

        if (data.success) {
          addAlert(`Disk activated on VM ${vm.vmid} as ${data.target_key}`, 'success');
        } else {
          addAlert(`Disk created but not activated: ${unusedKey}`, 'error');
        }
      } else {
        console.warn('No matching unused disk found');
        addAlert(`Disk created on VM ${vm.vmid} (no matching unused entry found).`, 'success');
      }

      if (vmWasRunning) {
        addAlert(`Starting VM ${vm.vmid}...`, 'success');
        await controlVM('start', vm.vmid, node, auth);
        await waitForVMStatus(vm.vmid, node, auth, 'running');
        addAlert(`VM ${vm.vmid} started successfully`, 'success');
      }

      refreshVMs();
      refreshConfig();
    } catch (err: any) {
      console.error('Error adding disk:', err);

      if (vmWasRunning) {
        try {
          await controlVM('start', vm.vmid, node, auth);
          addAlert(`VM ${vm.vmid} restarted after error`, 'success');
        } catch {
          addAlert(`Failed to restart VM ${vm.vmid}`, 'error');
        }
      }

      addAlert(`Failed to add disk: ${JSON.stringify(err.response?.data) || err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsAddingDisk(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper title="Add Disk" onClose={onClose}>
      <DiskWarning />
      <DiskForm
        size={size}
        setSize={setSize}
        handleSubmit={handleSubmit}
        error={error}
        loading={loading}
      />
    </ModalWrapper>
  );
};

export default DiskModal;