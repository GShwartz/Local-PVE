import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Auth, TaskStatus, VMCreate } from './types'; // Adjust path as needed

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

const createVM = async ({ node, vmCreate, csrf, ticket }: { node: string; vmCreate: VMCreate; csrf: string; ticket: string }): Promise<string> => {
  console.log(`Sending VM creation request on node ${node} with payload:`, vmCreate);
  try {
    const { data } = await axios.post<string>(
      `${API_BASE}/vm/${node}`,
      vmCreate,
      { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
    );
    console.log(`VM creation request successful, response: ${data}`);
    return data;
  } catch (error) {
    console.error(`VM creation failed:`, error);
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

export const useCreateVMMutation = (
  auth: Auth,
  node: string,
  queryClient: any,
  addAlert: (message: string, type: string) => void,
  closeModal: () => void
) => {
  return useMutation({
    mutationFn: (vmCreate: VMCreate) => createVM({ node, vmCreate, csrf: auth.csrf_token, ticket: auth.ticket }),
    onSuccess: (upid: string) => {
      addAlert('VM creation initiated successfully', 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM creation failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM creation completed successfully.`, 'success');
            }
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
            }, 5000);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM creation failed.`, 'error');
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

interface CreateVMModalProps {
  isOpen: boolean;
  closeModal: () => void;
  auth: Auth;
  node: string;
  queryClient: any;
  addAlert: (message: string, type: string) => void;
}

const CreateVMModal = ({ isOpen, closeModal, auth, node, queryClient, addAlert }: CreateVMModalProps) => {
  const [vmName, setVmName] = useState('');
  const [cpus, setCpus] = useState(1);
  const [ram, setRam] = useState(2048);
  const [source, setSource] = useState('');
  const [nameError, setNameError] = useState(true); // Initialize as true to show error state
  const [cpuError, setCpuError] = useState(false);
  const [ramError, setRamError] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);

  const createVMMutation = useCreateVMMutation(auth, node, queryClient, addAlert, closeModal);

  const isValidName = (name: string): boolean => {
    const regex = /^[a-zA-Z0-9_-]{1,40}$/;
    return regex.test(name);
  };

  const cpuOptions = [1, 2, 4];
  const ramOptions = [512, 1024, 2048, 4096, 8192];
  const sourceOptions = ['QCOW2', 'iso placeholder', 'qcow2 placeholder'];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setVmName(name);
    setNameError(!isValidName(name) || name === '');
  };

  const handleSourceSelect = (value: string) => {
    if (value === 'iso placeholder' || value === 'qcow2 placeholder') {
      setSource(value);
      setSourceError(false);
      setIsSourceDropdownOpen(false);
    }
  };

  const toggleSourceDropdown = () => {
    setIsSourceDropdownOpen(!isSourceDropdownOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!isValidName(vmName) || vmName === '') {
      setNameError(true);
      addAlert('VM name must be 1-40 characters and contain only letters, numbers, underscores, or hyphens', 'error');
      hasError = true;
    } else {
      setNameError(false);
    }

    if (cpus < 1 || cpus > 32 || !cpuOptions.includes(cpus)) {
      setCpuError(true);
      addAlert('CPUs must be one of: 1, 2, 4', 'error');
      hasError = true;
    } else {
      setCpuError(false);
    }

    if (ram < 512 || ram > 65536 || !ramOptions.includes(ram)) {
      setRamError(true);
      addAlert('RAM must be one of: 512, 1024, 2048, 4096, 8192 MB', 'error');
      hasError = true;
    } else {
      setRamError(false);
    }

    if (!source || !['iso placeholder', 'qcow2 placeholder'].includes(source)) {
      setSourceError(true);
      addAlert('Source must be selected from the available options', 'error');
      hasError = true;
    } else {
      setSourceError(false);
    }

    if (!hasError) {
      const vmCreate: VMCreate = { name: vmName, cpus, ram, source };
      createVMMutation.mutate(vmCreate);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Create Virtual Machine</h2>
        <form className="grid grid-cols-2 gap-8" onSubmit={handleSubmit}>
          <div className="col-span-1">
            <div className="mb-8">
              <div className="relative">
                <button
                  id="sourceDropdownButton"
                  type="button"
                  onClick={toggleSourceDropdown}
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center justify-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 w-44"
                >
                  {source || 'Source'}
                  <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
                  </svg>
                </button>
                <div
                  id="sourceDropdown"
                  className={`z-10 ${isSourceDropdownOpen ? 'block' : 'hidden'} bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-44 dark:bg-gray-700 dark:divide-gray-600 absolute mt-1`}
                >
                  <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    <div>ISO</div>
                    <div className="font-medium truncate"></div>
                  </div>
                  <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="sourceDropdownButton">
                    <li>
                      <button
                        type="button"
                        onClick={() => handleSourceSelect('iso placeholder')}
                        className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white w-full text-left"
                      >
                        iso placeholder
                      </button>
                    </li>
                  </ul>
                  <div className="py-2 divide-y divide-gray-100 dark:divide-gray-600">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">QCOW2</div>
                    <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                      <li>
                        <button
                          type="button"
                          onClick={() => handleSourceSelect('qcow2 placeholder')}
                          className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white w-full text-left"
                        >
                          qcow2 placeholder
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {sourceError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                  <span className="font-medium">Oops!</span> Invalid source selection!
                </p>
              )}
            </div>
          </div>
          <div className="col-span-1">
            <div className="mb-8">
              <label htmlFor="vm-name" className={`block mb-2 text-sm font-medium ${nameError ? 'text-red-700 dark:text-red-500' : 'text-green-700 dark:text-green-500'}`}>
                VM Name
              </label>
              <input
                type="text"
                id="vm-name"
                value={vmName}
                onChange={handleNameChange}
                className={`text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 ${
                  nameError
                    ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500'
                    : 'bg-green-50 border border-green-500 text-green-900 dark:text-green-400 placeholder-green-700 dark:placeholder-green-500 focus:ring-green-500 focus:border-green-500 dark:border-green-500'
                }`}
                placeholder="Enter VM name"
                required
              />
              <p className={`mt-2 text-sm ${nameError ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>
                <span className="font-medium">{nameError ? 'Oops!' : 'Alright!'}</span>
                {nameError ? ' Invalid VM name!' : ' VM name available!'}
              </p>
            </div>
            <div className="mb-8">
              <label htmlFor="cpus" className={`block mb-2 text-sm font-medium ${cpuError ? 'text-red-700 dark:text-red-500' : 'text-green-700 dark:text-green-500'}`}>
                CPUs
              </label>
              <select
                id="cpus"
                value={cpus}
                onChange={(e) => setCpus(parseInt(e.target.value))}
                className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
                required
              >
                <option value="" disabled>Select CPU count</option>
                {cpuOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {cpuError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                  <span className="font-medium">Oops!</span> Invalid CPU selection!
                </p>
              )}
            </div>
            <div className="mb-8">
              <label htmlFor="ram" className={`block mb-2 text-sm font-medium ${ramError ? 'text-red-700 dark:text-red-500' : 'text-green-700 dark:text-green-500'}`}>
                RAM (MB)
              </label>
              <select
                id="ram"
                value={ram}
                onChange={(e) => setRam(parseInt(e.target.value))}
                className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
                required
              >
                <option value="" disabled>Select RAM size</option>
                {ramOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {ramError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                  <span className="font-medium">Oops!</span> Invalid RAM selection!
                </p>
              )}
            </div>
          </div>
          <div className="col-span-2 flex justify-end space-x-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              disabled={createVMMutation.isPending}
            >
              {createVMMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVMModal;