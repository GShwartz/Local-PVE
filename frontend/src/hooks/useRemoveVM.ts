import { QueryClient } from '@tanstack/react-query';
import { VM, Auth, TaskStatus } from '../types';

interface Params {
  vm: VM;
  auth: Auth;
  addAlert: (m: string, t: string) => void;
  refreshVMs: () => void;
  queryClient: QueryClient;
  setIsRemoving: (v: boolean) => void;
  API_BASE_URL: string;
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
  API_BASE_URL,
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
      const response = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
          auth.csrf_token
        )}&ticket=${encodeURIComponent(auth.ticket)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error(`Failed to initiate VM deletion: ${await response.text()}`);

      let upid = await response.text();
      upid = upid.trim().replace(/^"|"$/g, '');

      let taskStatus: TaskStatus;
      do {
        const taskResponse = await fetch(
          `${API_BASE_URL}/task/${PROXMOX_NODE}/${encodeURIComponent(
            upid
          )}?csrf_token=${encodeURIComponent(auth.csrf_token)}&ticket=${encodeURIComponent(auth.ticket)}`
        );
        if (!taskResponse.ok) throw new Error(`Failed to get task status: ${await taskResponse.text()}`);

        taskStatus = await taskResponse.json();
        if (taskStatus.status !== 'stopped') await new Promise((resolve) => setTimeout(resolve, 500));
      } while (taskStatus.status !== 'stopped');

      if (taskStatus.exitstatus !== 'OK') throw new Error(`Deletion task failed: ${taskStatus.exitstatus}`);

      addAlert(`VM "${vm.name}" has been successfully deleted.`, 'success');
      refreshVMs();
    } catch (error: any) {
      queryClient.setQueryData<VM[]>(['vms'], previousVms);
      addAlert(`Failed to delete VM "${vm.name}": ${error.message}`, 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  return handleRemove;
};
