// vmMutations.tsx
import { useMutation } from '@tanstack/react-query';
import { Auth, TaskStatus, VMCloneRequest } from '../types';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface ControlParams {
  node: string;
  vmid: number;
  action: string;
  csrf: string;
  ticket: string;
}

interface UpdateConfigParams {
  node: string;
  vmid: number;
  updates: { name?: string; cpus?: number; ram?: number };
  csrf: string;
  ticket: string;
}

interface SnapshotParams {
  node: string;
  vmid: number;
  snapname: string;
  csrf: string;
  ticket: string;
}

const controlVM = async ({ node, vmid, action, csrf, ticket }: ControlParams): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/${action}`,
    {},
    {
      headers: { CSRFPreventionToken: csrf },
      params: { csrf_token: csrf, ticket },
      withCredentials: true,
    }
  );
  return data;
};

const updateVMConfig = async ({ node, vmid, updates, csrf, ticket }: UpdateConfigParams): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/update_config`,
    updates,
    {
      headers: { CSRFPreventionToken: csrf },
      params: { csrf_token: csrf, ticket },
      withCredentials: true,
    }
  );
  return data;
};

const revertSnapshot = async ({ node, vmid, snapname, csrf, ticket }: SnapshotParams): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot/${snapname}/revert`,
    {},
    {
      headers: { CSRFPreventionToken: csrf },
      params: { csrf_token: csrf, ticket },
      withCredentials: true,
    }
  );
  return data;
};

const deleteSnapshot = async ({ node, vmid, snapname, csrf, ticket }: SnapshotParams): Promise<string> => {
  const { data } = await axios.delete<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot/${snapname}`,
    {
      headers: { CSRFPreventionToken: csrf },
      params: { csrf_token: csrf, ticket },
      withCredentials: true,
    }
  );
  return data;
};

const createSnapshot = async ({ node, vmid, snapname, csrf, ticket }: SnapshotParams): Promise<string> => {
  const payload = { snapname, description: '', vmstate: 0 };
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot`,
    payload,
    {
      headers: { CSRFPreventionToken: csrf },
      params: { csrf_token: csrf, ticket },
      withCredentials: true,
    }
  );
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
        const { data } = await axios.post<string>(
          `${API_BASE}/vm/${node}/qemu/${vmid}/clone`,
          payload,
          {
            headers: { CSRFPreventionToken: auth.csrf_token },
            params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
            withCredentials: true,
          }
        );
        return data;
      }

      if (action === 'update_config') {
        const updates: { name?: string; cpus?: number; ram?: number } = {};
        if (name) updates.name = name;
        if (cpus !== undefined) updates.cpus = cpus;
        if (ram !== undefined) updates.ram = ram;
        return await updateVMConfig({ node, vmid, updates, csrf: auth.csrf_token, ticket: auth.ticket });
      }

      return await controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket });
    },

    onMutate: (vars) => {
      const { vmid, action } = vars;
      setPendingActions(prev => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), action],
      }));
    },

    onSuccess: (upid, vars) => {
      const { vmid, action, name, cpus, ram } = vars;
      const pollTask = async () => {
        try {
          const { data: status } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (status.status === 'stopped') {
            if (status.exitstatus !== 'OK') {
              addAlert(`VM ${name || ''} (${vmid}) ${action} failed: ${status.exitstatus}`, 'error');
            } else {
              if (action === 'update_config') {
                if (cpus !== undefined) addAlert(`VM (${vmid}) CPU updated to ${cpus}`, 'success');
                if (ram !== undefined) addAlert(`VM (${vmid}) RAM updated to ${ram}MB`, 'success');
                if (name) addAlert(`VM (${vmid}) renamed to "${name}"`, 'success');
              } else {
                addAlert(`VM ${name || ''} (${vmid}) ${action} succeeded`, 'success');
              }
            }
            queryClient.invalidateQueries(['vms']);
            setPendingActions(prev => ({
              ...prev,
              [vmid]: (prev[vmid] || []).filter(a => a !== action),
            }));
          } else {
            setTimeout(pollTask, 1000);
          }
        } catch {
          addAlert(`Polling task for VM ${vmid} ${action} failed`, 'error');
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
      const msg = error.response?.data?.detail || error.message;
      addAlert(`VM ${name || ''} (${vmid}) ${action} error: ${msg}`, 'error');
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
      revertSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
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
          const { data: status } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
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
      const msg = error.response?.data?.detail || error.message;
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
      deleteSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
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
          const { data: status } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
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
      const msg = error.response?.data?.detail || error.message;
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
      return createSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
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
          const { data: status } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
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
      const msg = error.response?.data?.detail || error.message;
      addAlert(`Snapshot create error for VM ${name || ''} (${vmid}): ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
      }));
    },
  });
};
