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

// Basic API calls
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

// Validate snapshot name
const isValidSnapshotName = (name: string): boolean => {
  const regex = /^[a-zA-Z0-9_+.\-]{1,40}$/;
  return regex.test(name);
};

// useVMMutation: handles start/stop/shutdown/reboot/clone/update_config
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

      // CLONE
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

      // UPDATE CONFIG
      if (action === 'update_config') {
        const updates: { name?: string; cpus?: number; ram?: number } = {};
        if (name) updates.name = name;
        if (cpus !== undefined) updates.cpus = cpus;
        if (ram !== undefined) updates.ram = ram;
        return await updateVMConfig({ node, vmid, updates, csrf: auth.csrf_token, ticket: auth.ticket });
      }

      // DEFAULT CONTROL
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
      const { vmid, action, name } = vars;
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
              addAlert(`VM ${name || ''} (${vmid}) ${action} succeeded`, 'success');
            }
            const delay = ['start','stop','shutdown','reboot','resume','hibernate','clone'].includes(action) ? 15000 : 0;
            setTimeout(() => {
              queryClient.invalidateQueries(['vms']);
              setPendingActions(prev => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter(a => a !== action),
              }));
            }, delay);
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

// useSnapshotMutation: revert
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
    onMutate: ({ vmid, snapname }) => {
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
              addAlert(`VM ${name || ''} (${vmid}) revert ${snapname} failed: ${status.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name || ''} (${vmid}) revert ${snapname} succeeded`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries(['vms']);
              setPendingActions(prev => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`),
              }));
            }, 15000);
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Polling revert for VM ${vmid} failed`, 'error');
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
      addAlert(`VM ${name || ''} (${vmid}) revert ${snapname} error: ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`),
      }));
    },
  });
};

// useDeleteSnapshotMutation
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
    onMutate: ({ vmid, snapname }) => {
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
              addAlert(`VM ${name || ''} (${vmid}) delete ${snapname} failed: ${status.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name || ''} (${vmid}) delete ${snapname} succeeded`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries(['snapshots', node, vmid]);
              setPendingActions(prev => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`),
              }));
            }, 5000);
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Polling delete for VM ${vmid} failed`, 'error');
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
      addAlert(`VM ${name || ''} (${vmid}) delete ${snapname} error: ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`),
      }));
    },
  });
};

// useCreateSnapshotMutation
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
    onMutate: ({ vmid, snapname }) => {
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
              addAlert(`VM ${name || ''} (${vmid}) create ${snapname} failed: ${status.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name || ''} (${vmid}) create ${snapname} succeeded`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries(['snapshots', node, vmid]);
              setPendingActions(prev => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
              }));
            }, 5000);
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          addAlert(`Polling create for VM ${vmid} failed`, 'error');
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
      addAlert(`VM ${name || ''} (${vmid}) create ${snapname} error: ${msg}`, 'error');
      setPendingActions(prev => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`),
      }));
    },
  });
};
