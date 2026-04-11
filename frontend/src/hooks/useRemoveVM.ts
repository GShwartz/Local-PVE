import { QueryClient } from '@tanstack/react-query';
import { VM, Auth, TaskStatus } from '../types';
import api from '../api';

interface Params {
  vm: VM;
  auth: Auth;
  addAlert: (m: string, t: string) => void;
  refreshVMs: () => void;
  queryClient: QueryClient;
  setIsRemoving: (v: boolean) => void;
  PROXMOX_NODE: string;
  setShowRemoveConfirm: (v: boolean) => void;
}

export const useRemoveVM = ({
  vm,
  auth,
  addAlert,
  refreshVMs,
  queryClient,
  setIsRemoving,
  PROXMOX_NODE,
  setShowRemoveConfirm,
}: Params) => {
  const handleRemove = async () => {
    setIsRemoving(true);
    setShowRemoveConfirm(false);
    addAlert(`Initiating deletion process for VM "${vm.name}"...`, 'warning');

    const previousVms = queryClient.getQueryData<VM[]>(['vms']);
    queryClient.setQueryData<VM[]>(['vms'], (oldVms) => oldVms?.filter((v) => v.vmid !== vm.vmid) || []);

    try {
      const { data: upidRaw } = await api.delete<string>(`/vm/${PROXMOX_NODE}/qemu/${vm.vmid}`);
      const upid = String(upidRaw).trim().replace(/^"|"$/g, '');

      let taskStatus: TaskStatus;
      do {
        const { data } = await api.get<TaskStatus>(`/task/${PROXMOX_NODE}/${encodeURIComponent(upid)}`);
        taskStatus = data;
        if (taskStatus.status !== 'stopped') await new Promise((resolve) => setTimeout(resolve, 500));
      } while (taskStatus.status !== 'stopped');

      if (taskStatus.exitstatus !== 'OK') throw new Error(`Deletion task failed: ${taskStatus.exitstatus}`);

      addAlert(`VM "${vm.name}" has been successfully deleted.`, 'success');
      refreshVMs();
    } catch (error: any) {
      queryClient.setQueryData<VM[]>(['vms'], previousVms);
      const msg = error?.response?.data?.detail || error.message;
      addAlert(`Failed to delete VM "${vm.name}": ${msg}`, 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  return handleRemove;
};
