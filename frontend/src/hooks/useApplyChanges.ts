import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { Auth, VM, TaskStatus } from '../types';

interface Changes {
  vmname: string | null;
  cpu: number | null;
  ram: string | null;
}

export function useApplyChanges(params: {
  node: string;
  auth: Auth;
  vm: VM;
  changesToApply: Changes;
  vmMutation: any;
  cancelEdit: () => void;
  setChangesToApply: (c: Changes) => void;
  setTableApplying: (is: boolean) => void;
  addAlert: (msg: string, type: string) => void;
}) {
  const { node, auth, vm, changesToApply, vmMutation, cancelEdit, setChangesToApply, setTableApplying, addAlert } = params;
  const queryClient = useQueryClient();

  const applyChanges = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTableApplying(true);

    try {
      const latestStatus = await axios.get<{ status: string }>(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/status`, {
        params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
      }).then((r) => r.data.status);

      const updates: any = {};
      if (changesToApply.vmname) updates.name = changesToApply.vmname;
      if (changesToApply.cpu !== null) updates.cpus = changesToApply.cpu;
      if (changesToApply.ram !== null) {
        const ramNum = changesToApply.ram.endsWith('GB')
          ? parseInt(changesToApply.ram.replace('GB', '')) * 1024
          : parseInt(changesToApply.ram.replace('MB', ''));
        updates.ram = ramNum;
      }
      if (!Object.keys(updates).length) return;

      if ((updates.cpus || updates.ram) && latestStatus === 'running') {
        addAlert(`Cannot apply CPU or RAM changes for running VM ${vm.vmid}`, 'error');
        return;
      }

      vmMutation.mutate({ vmid: vm.vmid, action: 'update_config', ...updates }, {
        onSuccess: async (upid: string) => {
          // Poll task until complete…
          let status: TaskStatus | null = null;
          do {
            status = (await axios.get<TaskStatus>(`http://localhost:8000/task/${node}/${upid}`, {
              params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
            })).data;
            if (status.status !== 'stopped') await new Promise((res) => setTimeout(res, 500));
          } while (status?.status !== 'stopped');

          if (status.exitstatus !== 'OK') throw new Error(`Task failed: ${status.exitstatus}`);

          // Retry-get VM info until matches expected…
          const max = 10, delay = 1000;
          let updatedVM: VM | null = null;
          for (let i = 0; i < max; i++) {
            const result = (await axios.get<VM>(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/config`, {
              params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
            })).data;
            const expectedName = changesToApply.vmname ?? vm.name;
            const expectedCPUs = changesToApply.cpu ?? vm.cpus;
            const expectedRAM = updates.ram ?? vm.ram;
            if (result.name === expectedName && result.cpus === expectedCPUs && result.ram === expectedRAM) {
              updatedVM = result;
              break;
            }
            await new Promise((res) => setTimeout(res, delay));
          }
          if (!updatedVM) throw new Error('Validation failed after retries.');

          queryClient.setQueryData(['vms'], (old: VM[] | undefined) =>
            !old ? [updatedVM!] : old.map((o) => (o.vmid === vm.vmid ? updatedVM! : o))
          );

          const changes: string[] = [];
          if (changesToApply.vmname) changes.push(`name changed to '${changesToApply.vmname}'`);
          if (changesToApply.cpu !== null) changes.push(`CPU updated to ${changesToApply.cpu}`);
          if (changesToApply.ram !== null) changes.push(`RAM set to ${changesToApply.ram}`);

          setChangesToApply({ vmname: null, cpu: null, ram: null });
          cancelEdit();

          if (changes.length) addAlert(`VM ${vm.vmid} updated: ${changes.join(', ')}`, 'success');
        },
        onError: (error: any) => addAlert(`Failed to update VM ${vm.vmid}: ${error.message}`, 'error'),
        onSettled: () => setTableApplying(false),
      });
    } catch (err: any) {
      addAlert(`Failed to fetch VM status for ${vm.vmid}`, 'error');
      setTableApplying(false);
    }
  };

  return { applyChanges };
}
