import { useMutation } from '@tanstack/react-query';
import { Auth, TaskStatus } from '../types';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

// API functions
const controlVM = async ({ node, vmid, action, csrf, ticket }: { node: string; vmid: number; action: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/${action}`,
    {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const updateVMConfig = async ({ node, vmid, updates, csrf, ticket }: { node: string; vmid: number; updates: { name?: string; cpus?: number; ram?: number }; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/update_config`,
    updates,
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const revertSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot/${snapname}/revert`,
    {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const deleteSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.delete<string>(
    `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot/${snapname}`,
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const createSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  if (!snapname || !isValidSnapshotName(snapname)) {
    console.error(`Invalid snapshot name: "${snapname}" for VM ${vmid} on node ${node}`);
    throw new Error('Snapshot name must be 1-40 characters and contain only letters, numbers, underscores, hyphens, dots, or plus signs');
  }
  const payload = {
    snapname,
    description: '',
    vmstate: 0,
  };
  console.log(`Sending snapshot creation request for VM ${vmid} on node ${node} with payload:`, payload);
  try {
    const { data } = await axios.post<string>(
      `${API_BASE}/vm/${node}/qemu/${vmid}/snapshot`,
      payload,
      { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
    );
    console.log(`Snapshot creation request successful for VM ${vmid}, response: ${data}`);
    return data;
  } catch (error) {
    console.error(`Snapshot creation failed for VM ${vmid}:`, error);
    throw error;
  }
};

// Validate snapshot name
const isValidSnapshotName = (name: string): boolean => {
  const regex = /^[a-zA-Z0-9_+.-]{1,40}$/;
  return regex.test(name);
};

export const useVMMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation<string, any, { vmid: number; action: string; name?: string; cpus?: number; ram?: number }, unknown>({
    mutationFn: async (variables) => {
      const { vmid, action } = variables;
      if (action === 'update_config') {
        const updates: { name?: string; cpus?: number; ram?: number } = {};
        if (variables.name) updates.name = variables.name;
        if (variables.cpus !== undefined) updates.cpus = variables.cpus;
        if (variables.ram !== undefined) updates.ram = variables.ram;
        return await updateVMConfig({ node, vmid, updates, csrf: auth.csrf_token, ticket: auth.ticket });
      }
      return await controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: (variables) => {
      const { vmid, action } = variables;
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), action],
      }));
      return undefined;
    },
    onSuccess: (upid: string, variables: { vmid: number; action: string; name?: string; cpus?: number; ram?: number }) => {
      const { action, vmid, name } = variables;
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) ${action} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) ${action} completed successfully.`, 'success');
            }
            const delayIfNeeded = ['start', 'reboot', 'stop', 'shutdown', 'resume', 'hibernate'].includes(action) ? 15000 : 0;
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              setPendingActions((prev) => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter((act) => act !== action),
              }));
            }, delayIfNeeded);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM ${name ? `${name} ` : ''}(${vmid}) ${action} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== action),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, variables: { vmid: number; action: string; name?: string; cpus?: number; ram?: number }, _context: unknown) => {
      const { vmid, action, name } = variables;
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      console.error(`Mutation failed for VM ${vmid}: ${message}`, error.response?.data);
      addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) ${action} failed: ${message}`, 'error');
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter((act) => act !== action),
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
    mutationFn: (variables) => {
      const { vmid, snapname } = variables;
      return revertSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: (variables) => {
      const { vmid, snapname } = variables;
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `revert-${snapname}`],
      }));
      return undefined;
    },
    onSuccess: (upid: string, variables: { vmid: number; snapname: string; name?: string }) => {
      const { vmid, snapname, name } = variables;
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) revert to snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) revert to snapshot ${snapname} completed successfully.`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              setPendingActions((prev) => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter((act) => act !== `revert-${snapname}`),
              }));
            }, 15000);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM ${name ? `${name} ` : ''}(${vmid}) revert to snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `revert-${snapname}`),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, variables: { vmid: number; snapname: string; name?: string }, _context: unknown) => {
      const { vmid, snapname, name } = variables;
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      console.error(`Snapshot revert failed for VM ${vmid}: ${message}`, error.response?.data);
      addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) revert to snapshot ${snapname} failed: ${message}`, 'error');
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter((act) => act !== `revert-${snapname}`),
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
    mutationFn: (variables) => {
      const { vmid, snapname } = variables;
      return deleteSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: (variables) => {
      const { vmid, snapname } = variables;
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `delete-${snapname}`],
      }));
      return undefined;
    },
    onSuccess: (upid: string, variables: { vmid: number; snapname: string; name?: string }) => {
      const { vmid, snapname, name } = variables;
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) deletion of snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) deletion of snapshot ${snapname} completed successfully.`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['snapshots', node, vmid] });
              setPendingActions((prev) => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter((act) => act !== `delete-${snapname}`),
              }));
            }, 5000);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM ${name ? `${name} ` : ''}(${vmid}) deletion of snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `delete-${snapname}`),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, variables: { vmid: number; snapname: string; name?: string }, _context: unknown) => {
      const { vmid, snapname, name } = variables;
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      console.error(`Snapshot deletion failed for VM ${vmid}: ${message}`, error.response?.data);
      addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) deletion of snapshot ${snapname} failed: ${message}`, 'error');
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter((act) => act !== `delete-${snapname}`),
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
    mutationFn: (variables) => {
      const { vmid, snapname } = variables;
      if (!snapname || !isValidSnapshotName(snapname)) {
        console.error(`Mutation rejected: Invalid snapname: "${snapname}" for VM ${vmid}`);
        throw new Error('Snapshot name must be 1-40 characters and contain only letters, numbers, underscores, hyphens, dots, or plus signs');
      }
      console.log(`Initiating snapshot creation mutation for VM ${vmid} with snapname: "${snapname}"`);
      return createSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: (variables) => {
      const { vmid, snapname } = variables;
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `create-${snapname}`],
      }));
      return undefined;
    },
    onSuccess: (upid: string, variables: { vmid: number; snapname: string; name?: string }) => {
      const { vmid, snapname, name } = variables;
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) snapshot ${snapname} completed successfully.`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['snapshots', node, vmid] });
              setPendingActions((prev) => ({
                ...prev,
                [vmid]: (prev[vmid] || []).filter((act) => act !== `create-${snapname}`),
              }));
            }, 5000);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM ${name ? `${name} ` : ''}(${vmid}) snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `create-${snapname}`),
          }));
        }
      };
      pollTask();
      closeModal();
    },
    onError: (error: any, variables: { vmid: number; snapname: string; name?: string }, _context: unknown) => {
      const { vmid, snapname, name } = variables;
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      console.error(`Snapshot creation failed for VM ${vmid}: ${message}`, error.response?.data);
      addAlert(`VM ${name ? `${name} ` : ''}(${vmid}) snapshot ${snapname} failed: ${message}`, 'error');
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter((act) => act !== `create-${snapname}`),
      }));
      closeModal();
    },
  });
};