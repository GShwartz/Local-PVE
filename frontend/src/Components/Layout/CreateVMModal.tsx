import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Auth, TaskStatus, VMCreate } from '../../types'; // Adjust path as needed

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

// ── OS Catalog types & defaults ───────────────────────────────────────────────

interface OSVersion  { id: string; label: string; }
interface OSFamily   { id: string; label: string; versions: OSVersion[]; }

const CATALOG_KEY = 'local-pve-os-catalog';

const DEFAULT_CATALOG: OSFamily[] = [
  { id: 'debian',       label: 'Debian',       versions: [
    { id: 'debian-12',             label: 'Debian 12'             },
    { id: 'debian-13',             label: 'Debian 13'             },
  ]},
  { id: 'ubuntu',       label: 'Ubuntu',       versions: [
    { id: 'ubuntu-server-24.04',   label: 'Ubuntu Server 24.04'   },
    { id: 'ubuntu-server-22.04',   label: 'Ubuntu Server 22.04'   },
  ]},
  { id: 'centos-stream', label: 'CentOS Stream', versions: [
    { id: 'centos-stream-9',       label: 'CentOS Stream 9'       },
    { id: 'centos-stream-10',      label: 'CentOS Stream 10'      },
  ]},
  { id: 'alma',         label: 'Alma',         versions: [
    { id: 'alma-9',                label: 'Alma 9'                },
    { id: 'alma-10',               label: 'Alma 10'               },
  ]},
];

const loadCatalog = (): OSFamily[] => {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) return JSON.parse(raw) as OSFamily[];
  } catch { /* ignore */ }
  return DEFAULT_CATALOG;
};

const saveCatalog = (catalog: OSFamily[]) => {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog)); } catch { /* ignore */ }
};

// ── Modal ─────────────────────────────────────────────────────────────────────

interface CreateVMModalProps {
  isOpen: boolean;
  closeModal: () => void;
  auth: Auth;
  node: string;
  queryClient: any;
  addAlert: (message: string, type: string) => void;
}

const CreateVMModal = ({ isOpen, closeModal, auth, node, queryClient, addAlert }: CreateVMModalProps) => {
  // Form state
  const [vmName,    setVmName]    = useState('');
  const [cpus,      setCpus]      = useState(1);
  const [ram,       setRam]       = useState(2048);
  const [osVersion, setOsVersion] = useState('');   // selected version label — sent as `source`

  // Validation
  const [nameError, setNameError] = useState(true);
  const [cpuError,  setCpuError]  = useState(false);
  const [ramError,  setRamError]  = useState(false);
  const [osError,   setOsError]   = useState(false);

  // OS dropdown
  const [osOpen,      setOsOpen]      = useState(false);
  const [adminOpen,   setAdminOpen]   = useState(false);
  const osDropdownRef = useRef<HTMLDivElement>(null);

  // Admin form state
  const [newFamilyName,      setNewFamilyName]      = useState('');
  const [newVersionFamilyId, setNewVersionFamilyId] = useState('');
  const [newVersionLabel,    setNewVersionLabel]     = useState('');

  // OS catalog
  const [catalog, setCatalog] = useState<OSFamily[]>(loadCatalog);

  const createVMMutation = useCreateVMMutation(auth, node, queryClient, addAlert, closeModal);

  const cpuOptions = [1, 2, 4];
  const ramOptions = [512, 1024, 2048, 4096, 8192];

  // Close OS dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (osDropdownRef.current && !osDropdownRef.current.contains(e.target as Node)) {
        setOsOpen(false);
      }
    };
    if (osOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [osOpen]);

  const isValidName = (name: string) => /^[a-zA-Z0-9_-]{1,40}$/.test(name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVmName(v);
    setNameError(!isValidName(v) || v === '');
  };

  const handleOsSelect = (versionLabel: string) => {
    setOsVersion(versionLabel);
    setOsError(false);
    setOsOpen(false);
  };

  // Admin: add a new OS family
  const handleAddFamily = () => {
    const label = newFamilyName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-');
    if (catalog.some(f => f.id === id)) {
      addAlert(`OS family "${label}" already exists.`, 'warning');
      return;
    }
    const updated = [...catalog, { id, label, versions: [] }];
    setCatalog(updated);
    saveCatalog(updated);
    setNewFamilyName('');
    addAlert(`OS family "${label}" added.`, 'success');
  };

  // Admin: add a version to an existing family
  const handleAddVersion = () => {
    const label = newVersionLabel.trim();
    if (!label || !newVersionFamilyId) return;
    const id = label.toLowerCase().replace(/[\s.]/g, '-');
    const updated = catalog.map(f =>
      f.id === newVersionFamilyId
        ? { ...f, versions: [...f.versions, { id, label }] }
        : f
    );
    setCatalog(updated);
    saveCatalog(updated);
    setNewVersionLabel('');
    addAlert(`Version "${label}" added.`, 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!isValidName(vmName) || vmName === '') {
      setNameError(true);
      addAlert('VM name must be 1–40 characters: letters, numbers, hyphens, underscores.', 'error');
      hasError = true;
    } else { setNameError(false); }

    if (!cpuOptions.includes(cpus)) {
      setCpuError(true);
      addAlert('CPUs must be one of: 1, 2, 4', 'error');
      hasError = true;
    } else { setCpuError(false); }

    if (!ramOptions.includes(ram)) {
      setRamError(true);
      addAlert('RAM must be one of: 512 MB, 1 GB, 2 GB, 4 GB, 8 GB', 'error');
      hasError = true;
    } else { setRamError(false); }

    if (!osVersion) {
      setOsError(true);
      addAlert('Please select an OS.', 'error');
      hasError = true;
    } else { setOsError(false); }

    if (!hasError) {
      createVMMutation.mutate({ name: vmName, cpus, ram, source: osVersion });
    }
  };

  if (!isOpen) return null;

  const fieldBase = 'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const fieldErr  = 'border-red-300 focus:ring-red-400/30 focus:border-red-400';
  const fieldOk   = 'border-gray-300';
  const adminInput = 'flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Create Virtual Machine</h2>
          </div>
          <button type="button" onClick={closeModal}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">

          {/* VM Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              VM Name
            </label>
            <input
              type="text"
              value={vmName}
              onChange={handleNameChange}
              className={`${fieldBase} ${nameError && vmName !== '' ? fieldErr : fieldOk}`}
              placeholder="e.g. my-server"
              autoFocus
            />
            {nameError && vmName !== '' && (
              <p className="mt-1 text-xs text-red-500">Letters, numbers, hyphens and underscores only (max 40).</p>
            )}
          </div>

          {/* OS */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Operating System
            </label>
            <div className="relative" ref={osDropdownRef}>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setOsOpen(v => !v)}
                className={`${fieldBase} flex items-center justify-between ${osError ? fieldErr : fieldOk}`}
              >
                <span className={osVersion ? 'text-gray-800' : 'text-gray-400'}>
                  {osVersion || 'Select OS…'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${osOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              {osOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  {/* OS families + versions */}
                  <div className="max-h-52 overflow-y-auto">
                    {catalog.map(family => (
                      <div key={family.id}>
                        {/* Family header — not selectable */}
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {family.label}
                          </span>
                        </div>
                        {/* Versions */}
                        {family.versions.length === 0 ? (
                          <div className="px-5 py-2 text-xs text-gray-400 italic">No versions yet</div>
                        ) : (
                          family.versions.map(ver => (
                            <button
                              key={ver.id}
                              type="button"
                              onClick={() => handleOsSelect(ver.label)}
                              className={`w-full text-left px-5 py-2 text-sm transition-colors
                                ${osVersion === ver.label
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                              {ver.label}
                            </button>
                          ))
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Admin section */}
                  <div className="border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setAdminOpen(v => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin
                      </span>
                      <svg className={`w-3 h-3 transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {adminOpen && (
                      <div className="px-3 pb-3 pt-1 space-y-3 bg-gray-50">

                        {/* Add OS family */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Add OS Family
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newFamilyName}
                              onChange={e => setNewFamilyName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFamily(); }}}
                              placeholder="e.g. Fedora"
                              className={adminInput}
                            />
                            <button
                              type="button"
                              onClick={handleAddFamily}
                              disabled={!newFamilyName.trim()}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        {/* Add version to existing family */}
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            Add Version
                          </p>
                          <div className="flex gap-1.5 mb-1.5">
                            <select
                              value={newVersionFamilyId}
                              onChange={e => setNewVersionFamilyId(e.target.value)}
                              className={`${adminInput} flex-none w-28`}
                            >
                              <option value="">Family…</option>
                              {catalog.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newVersionLabel}
                              onChange={e => setNewVersionLabel(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVersion(); }}}
                              placeholder="e.g. Fedora 41"
                              className={adminInput}
                            />
                            <button
                              type="button"
                              onClick={handleAddVersion}
                              disabled={!newVersionLabel.trim() || !newVersionFamilyId}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {osError && <p className="mt-1 text-xs text-red-500">Please select an OS.</p>}
          </div>

          {/* CPUs + RAM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CPUs</label>
              <select value={cpus} onChange={e => setCpus(parseInt(e.target.value))}
                className={`${fieldBase} ${cpuError ? fieldErr : fieldOk}`}>
                {cpuOptions.map(o => <option key={o} value={o}>{o} {o === 1 ? 'core' : 'cores'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">RAM</label>
              <select value={ram} onChange={e => setRam(parseInt(e.target.value))}
                className={`${fieldBase} ${ramError ? fieldErr : fieldOk}`}>
                {ramOptions.map(o => <option key={o} value={o}>{o >= 1024 ? `${o / 1024} GB` : `${o} MB`}</option>)}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createVMMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {createVMMutation.isPending ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : 'Create VM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVMModal;