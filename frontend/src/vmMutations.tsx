import { useMutation } from '@tanstack/react-query';
import { Auth, TaskStatus } from './types'; // Adjust path as needed
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

// API functions
const controlVM = async ({ node, vmid, action, csrf, ticket }: { node: string; vmid: number; action: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/${action}`,
    {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const revertSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/snapshot/${snapname}/revert`,
    {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const deleteSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.delete<string>(
    `${API_BASE}/vm/${node}/${vmid}/snapshot/${snapname}`,
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
      `${API_BASE}/vm/${node}/${vmid}/snapshot`,
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
  return useMutation({
    mutationFn: async ({ vmid, action }: { vmid: number; action: string }) => {
      return await controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: ({ vmid, action }) => {
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), action],
      }));
    },
    onSuccess: (upid: string, { action, vmid }: { vmid: number; action: string }) => {
      addAlert(`VM ${vmid} ${action} initiated successfully.`, 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${vmid} ${action} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${vmid} ${action} completed successfully.`, 'success');
            }
            const delayIfNeeded = ['start', 'reboot'].includes(action) ? 15000 : 0;
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
          addAlert(`Polling for VM ${vmid} ${action} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== action),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, { vmid, action }: { vmid: number; action: string }) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      addAlert(`VM ${vmid} ${action} failed: ${message}`, 'error');
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
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) =>
      revertSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
    onMutate: ({ vmid, snapname }) => {
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `revert-${snapname}`],
      }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`VM ${vmid} revert to snapshot ${snapname} initiated successfully.`, 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${vmid} revert to snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${vmid} revert to snapshot ${snapname} completed successfully.`, 'success');
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
          addAlert(`Polling for VM ${vmid} revert to snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `revert-${snapname}`),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      addAlert(`VM ${vmid} revert to snapshot ${snapname} failed: ${message}`, 'error');
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
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) =>
      deleteSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
    onMutate: ({ vmid, snapname }) => {
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `delete-${snapname}`],
      }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`VM ${vmid} deletion of snapshot ${snapname} initiated successfully.`, 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${vmid} deletion of snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${vmid} deletion of snapshot ${snapname} completed successfully.`, 'success');
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
          addAlert(`Polling for VM ${vmid} deletion of snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `delete-${snapname}`),
          }));
        }
      };
      pollTask();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      addAlert(`VM ${vmid} deletion of snapshot ${snapname} failed: ${message}`, 'error');
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
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) => {
      if (!snapname || !isValidSnapshotName(snapname)) {
        console.error(`Mutation rejected: Invalid snapname: "${snapname}" for VM ${vmid}`);
        throw new Error('Snapshot name must be 1-40 characters and contain only letters, numbers, underscores, hyphens, dots, or plus signs');
      }
      console.log(`Initiating snapshot creation mutation for VM ${vmid} with snapname: "${snapname}"`);
      return createSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: ({ vmid, snapname }) => {
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: [...(prev[vmid] || []), `create-${snapname}`],
      }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`VM ${vmid} snapshot ${snapname} initiated successfully.`, 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${vmid} snapshot ${snapname} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${vmid} snapshot ${snapname} completed successfully.`, 'success');
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
          addAlert(`Polling for VM ${vmid} snapshot ${snapname} failed.`, 'error');
          setPendingActions((prev) => ({
            ...prev,
            [vmid]: (prev[vmid] || []).filter((act) => act !== `create-${snapname}`),
          }));
        }
      };
      pollTask();
      closeModal();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      console.error(`Snapshot creation mutation failed for VM ${vmid} with snapname "${snapname}": ${message}`);
      addAlert(`VM ${vmid} snapshot ${snapname} failed: ${message}`, 'error');
      setPendingActions((prev) => ({
        ...prev,
        [vmid]: (prev[vmid] || []).filter((act) => act !== `create-${snapname}`),
      }));
      closeModal();
    },
  });
};