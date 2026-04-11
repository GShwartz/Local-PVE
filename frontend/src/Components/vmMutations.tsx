import { useMutation } from '@tanstack/react-query';
import { Auth, TaskStatus, VMCloneRequest, VMCreate } from '../types';
import api from '../api';

interface ControlParams {
  node: string;
  vmid: number;
  action: string;
}

interface UpdateConfigParams {
  node: string;
  vmid: number;
  updates: { name?: string; cpus?: number; ram?: number };
}

interface SnapshotParams {
  node: string;
  vmid: number;
  snapname: string;
}

const controlVM = async ({ node, vmid, action }: ControlParams): Promise<string> => {
  const { data } = await api.post<string>(`/vm/${node}/qemu/${vmid}/${action}`);
  return data;
};

const updateVMConfig = async ({ node, vmid, updates }: UpdateConfigParams): Promise<string> => {
  const { data } = await api.post<string>(`/vm/${node}/qemu/${vmid}/update_config`, updates);
  return data;
};

const revertSnapshot = async ({ node, vmid, snapname }: SnapshotParams): Promise<string> => {
  const { data } = await api.post<string>(`/vm/${node}/qemu/${vmid}/snapshot/${snapname}/revert`);
  return data;
};

const deleteSnapshot = async ({ node, vmid, snapname }: SnapshotParams): Promise<string> => {
  const { data } = await api.delete<string>(`/vm/${node}/qemu/${vmid}/snapshot/${snapname}`);
  return data;
};

const createSnapshot = async ({ node, vmid, snapname }: SnapshotParams): Promise<string> => {
  const payload = { snapname, description: '', vmstate: 0 };
  const { data } = await api.post<string>(`/vm/${node}/qemu/${vmid}/snapshot`, payload);
  return data;
};

const isValidSnapshotName = (name: string): boolean => /^[a-zA-Z0-9_+.\-]{1,40}$/.test(name);

export const useVMMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation<string, any, { vmid: number; action: string; name?: string; cpus?: number; ram?: number }, unknown>({
    mutationFn: async (vars) => {
      const { vmid, action, name, cpus, ram } = vars;

      if (action === 'clone') {
        const payload: VMCloneRequest = {
          name: name || 'test',
          full: true,
          target: node,
        };
        const { data } = await api.post<string>(`/vm/${node}/qemu/${vmid}/clone`, payload);
        return data;
      }

      if (action === 'update_config') {
        const updates: { name?: string; cpus?: number; ram?: number } = {};
        if (name) updates.name = name;
        if (cpus !== undefined) updates.cpus = cpus;
        if (ram !== undefined) updates.ram = ram;
        return await updateVMConfig({ node, vmid, updates });
      }

      return await controlVM({ node, vmid, action });
    },

    onMutate: (vars) => {
      const { vmid, action } = vars;
      console.log('🏁 onMutate: Adding', action, 'to pendingActions for VM', vmid);
      setPendingActions(prev => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), action],
      }));
    },

    onSuccess: (upid, vars) => {
      const { vmid, action, name, cpus, ram } = vars;
      console.log('🏃 onSuccess: Starting polling for', action, 'on VM', vmid, 'with upid', upid);
      
      const pollTask = async () => {
        try {
          const { data: status } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          
          console.log('📊 Poll result for VM', vmid, action, ':', status);
          
          if (status.status === 'stopped') {
            if (status.exitstatus !== 'OK') {
              // Always show failures
              addAlert(`VM ${name || ''} (${vmid}) ${action} failed: ${status.exitstatus}`, 'error');
            } else {
              // Success handling:
              // - For update_config: keep granular success alerts.
              // - For control actions (start/stop/shutdown/reboot/suspend/resume/clone/...): suppress here
              //   and let the UI/component own the success toast to avoid doubles.
              if (action === 'update_config') {
                if (cpus !== undefined) addAlert(`VM (${vmid}) CPU updated to ${cpus}`, 'success');
                if (ram !== undefined) addAlert(`VM (${vmid}) RAM updated to ${ram}MB`, 'success');
                if (name) addAlert(`VM (${vmid}) renamed to "${name}"`, 'success');
              }
            }

            // ✅ Always refresh VM list after any action
            queryClient.invalidateQueries(['vms']);

            // 🔧 SPECIAL HANDLING FOR REBOOT: Keep it in pendingActions for 15 seconds
            if (action === 'reboot' && status.exitstatus === 'OK') {
              console.log('⏰ Reboot completed, keeping in pendingActions for 15 seconds for VM', vmid);
              // Don't remove reboot immediately - wait 15 seconds for UI stability
              setTimeout(() => {
                console.log('🧹 Removing reboot from pendingActions after 15s delay for VM', vmid);
                setPendingActions(prev => ({
                  ...prev,
                  [vmid]: (prev[vmid] || []).filter(a => a !== action),
                }));
              }, 15000);
            } else {
              // For all other actions, remove immediately as before
              console.log('🧹 Immediately removing', action, 'from pendingActions for VM', vmid);
              setPendingActions(prev => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter(a => a !== action),
              }));
            }
          } else {
            setTimeout(pollTask, 1000);
          }
        } catch {
          addAlert(`Polling task for VM ${vmid} ${action} failed`, 'error');
          console.log('❌ Polling failed, removing', action, 'from pendingActions for VM', vmid);
          setPendingActions(prev => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter(a => a !== action),
          }));
        }
      };
      pollTask();
    },

    onError: (error, vars) => {
      const { vmid, action, name } = vars;
      const msg = error?.response?.data?.detail || error.message;
      // Keep error alerts – users need to see failures regardless of who owns success
      addAlert(`VM ${name || ''} (${vmid}) ${action} error: ${msg}`, 'error');
      console.log('❌ onError: Removing', action, 'from pendingActions for VM', vmid);
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== action),
      }));
    },
  });
};

export const useSnapshotMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation<string, any, { vmid: number; snapname: string; name?: string }, unknown>({
    mutationFn: ({ vmid, snapname }) =>
      revertSnapshot({ node, vmid, snapname }),
    onMutate: ({ vmid, snapname, name }) => {
      addAlert(`Reverting VM ${name || ''} (${vmid}) to snapshot "${snapname}"...`, 'info');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `revert-${snapname}`],
      }));
    },
    onSuccess: (upid, { vmid, snapname, name }) => {
      const poll = async () => {
        try {
          const { data: status } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          if (status.status === 'stopped') {
            if (status.exitstatus !== 'OK') {
              addAlert(`VM ${name || ''} (${vmid}) failed to revert snapshot "${snapname}": ${status.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name || ''} (${vmid}) successfully reverted to snapshot "${snapname}"`, 'success');
            }
            queryClient.invalidateQueries(['vms']);
            setPendingActions(prev => ({
              ...prev,
              [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`),
            }));
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Error polling snapshot revert for VM ${vmid}`, 'error');
          setPendingActions(prev => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`),
          }));
        }
      };
      poll();
    },
    onError: (error, { vmid, snapname, name }) => {
      const msg = error?.response?.data?.detail || error.message;
      addAlert(`Snapshot revert error for VM ${name || ''} (${vmid}): ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`),
      }));
    },
  });
};

export const useDeleteSnapshotMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation<string, any, { vmid: number; snapname: string; name?: string }, unknown>({
    mutationFn: ({ vmid, snapname }) =>
      deleteSnapshot({ node, vmid, snapname }),
    onMutate: ({ vmid, snapname, name }) => {
      addAlert(`Deleting snapshot "${snapname}" from VM ${name || ''} (${vmid})...`, 'info');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `delete-${snapname}`],
      }));
    },
    onSuccess: (upid, { vmid, snapname, name }) => {
      const poll = async () => {
        try {
          const { data: status } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          if (status.status === 'stopped') {
            if (status.exitstatus !== 'OK') {
              addAlert(`Snapshot deletion failed for VM ${name || ''} (${vmid}): ${status.exitstatus}`, 'error');
            } else {
              addAlert(`Snapshot "${snapname}" deleted from VM ${name || ''} (${vmid})`, 'success');
            }
            queryClient.invalidateQueries(['snapshots', node, vmid]);
            setPendingActions(prev => ({
              ...prev,
              [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`),
            }));
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Error polling snapshot delete for VM ${vmid}`, 'error');
          setPendingActions(prev => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`),
          }));
        }
      };
      poll();
    },
    onError: (error, { vmid, snapname, name }) => {
      const msg = error?.response?.data?.detail || error.message;
      addAlert(`Snapshot delete error for VM ${name || ''} (${vmid}): ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`),
      }));
    },
  });
};

export const useCreateSnapshotMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>,
  closeModal: () => void
) => {
  return useMutation<string, any, { vmid: number; snapname: string; name?: string }, unknown>({
    mutationFn: ({ vmid, snapname }) => {
      if (!isValidSnapshotName(snapname)) {
        throw new Error('Invalid snapshot name');
      }
      return createSnapshot({ node, vmid, snapname });
    },
    onMutate: ({ vmid, snapname, name }) => {
      addAlert(`Creating snapshot "${snapname}" for VM ${name || ''} (${vmid})...`, 'info');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `create-${snapname}`],
      }));
    },
    onSuccess: (upid, { vmid, snapname, name }) => {
      closeModal();
      const poll = async () => {
        try {
          const { data: status } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          if (status.status === 'stopped') {
            if (status.exitstatus !== 'OK') {
              addAlert(`Snapshot "${snapname}" creation failed for VM ${name || ''} (${vmid}): ${status.exitstatus}`, 'error');
            } else {
              addAlert(`Snapshot "${snapname}" successfully created for VM ${name || ''} (${vmid})`, 'success');
            }
            queryClient.invalidateQueries(['snapshots', node, vmid]);
            setPendingActions(prev => ({
              ...prev,
              [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
            }));
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Error polling snapshot create for VM ${vmid}`, 'error');
          setPendingActions(prev => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
          }));
        }
      };
      poll();
    },
    onError: (error, { vmid, snapname, name }) => {
      closeModal();
      const msg = error?.response?.data?.detail || error.message;
      addAlert(`Snapshot create error for VM ${name || ''} (${vmid}): ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
      }));
    },
  });
};

// ── VM Creation ────────────────────────────────────────────────────────────────

const createVM = async ({ node, vmCreate }: { node: string; vmCreate: VMCreate }): Promise<string> => {
  const { data } = await api.post<string>(`/vm/${node}`, vmCreate);
  return data;
};

export const useCreateVMMutation = (
  auth: Auth,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  closeModal: () => void
) => {
  return useMutation({
    mutationFn: ({ vmCreate, node }: { vmCreate: VMCreate; node: string }) =>
      createVM({ node, vmCreate }),
    onSuccess: (upid: string, { node }: { vmCreate: VMCreate; node: string }) => {
      addAlert('VM creation initiated successfully', 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM creation failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert('VM creation completed successfully.', 'success');
            }
            setTimeout(() => { queryClient.invalidateQueries({ queryKey: ['vms'] }); }, 5000);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch {
          addAlert('Polling for VM creation failed.', 'error');
        }
      };
      pollTask();
      closeModal();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      addAlert(`Error creating VM: ${message}`, 'error');
      closeModal();
    },
  });
};