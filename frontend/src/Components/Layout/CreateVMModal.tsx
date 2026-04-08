import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Server, Plus, Upload, FileCode, Trash2 } from 'lucide-react';
import { Auth, TaskStatus, VMCreate } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';

const API_BASE = 'http://localhost:8000';

// ── API helpers ────────────────────────────────────────────────────────────────────────────────

const controlVM = async ({ node, vmid, action, csrf, ticket }: { node: string; vmid: number; action: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/${action}`, {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const revertSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/snapshot/${snapname}/revert`, {},
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

const isValidSnapshotName = (name: string): boolean => /^[a-zA-Z0-9_+.-]{1,40}$/.test(name);

const createSnapshot = async ({ node, vmid, snapname, csrf, ticket }: { node: string; vmid: number; snapname: string; csrf: string; ticket: string }): Promise<string> => {
  if (!snapname || !isValidSnapshotName(snapname)) throw new Error('Invalid snapshot name');
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/snapshot`,
    { snapname, description: '', vmstate: 0 },
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const createVM = async ({ node, vmCreate, csrf, ticket }: { node: string; vmCreate: VMCreate & { user_data?: string; disk_size?: number; disk_controller?: string }; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}`, vmCreate,
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data;
};

// ── Mutation hooks (exported for other components) ────────────────────────────────────────────

export const useVMMutation = (
  auth: Auth, node: string, queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation({
    mutationFn: async ({ vmid, action }: { vmid: number; action: string }) =>
      controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket }),
    onMutate: ({ vmid, action }) => {
      setPendingActions(prev => ({ ...prev, [vmid]: [...(prev[vmid] || []), action] }));
    },
    onSuccess: (upid: string, { action, vmid }: { vmid: number; action: string }) => {
      addAlert(`VM ${vmid} ${action} initiated.`, 'success');
      const poll = async () => {
        try {
          const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') addAlert(`VM ${vmid} ${action} failed: ${t.exitstatus}`, 'error');
            else addAlert(`VM ${vmid} ${action} completed.`, 'success');
            const delay = ['start', 'reboot'].includes(action) ? 15000 : 0;
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== action) }));
            }, delay);
            return;
          }
          setTimeout(poll, 1000);
        } catch {
          addAlert(`Polling VM ${vmid} ${action} failed.`, 'error');
          setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== action) }));
        }
      };
      poll();
    },
    onError: (error: any, { vmid, action }: { vmid: number; action: string }) => {
      addAlert(`VM ${vmid} ${action} failed: ${error.response?.data?.detail || error.message}`, 'error');
      setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== action) }));
    },
  });
};

export const useSnapshotMutation = (
  auth: Auth, node: string, queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) =>
      revertSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
    onMutate: ({ vmid, snapname }) => {
      setPendingActions(prev => ({ ...prev, [vmid]: [...(prev[vmid] || []), `revert-${snapname}`] }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`VM ${vmid} revert to ${snapname} initiated.`, 'success');
      const poll = async () => {
        try {
          const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') addAlert(`Revert failed: ${t.exitstatus}`, 'error');
            else addAlert(`VM ${vmid} reverted to ${snapname}.`, 'success');
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`) }));
            }, 15000);
            return;
          }
          setTimeout(poll, 1000);
        } catch {
          addAlert(`Polling revert failed.`, 'error');
          setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`) }));
        }
      };
      poll();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`Revert ${snapname} failed: ${error.response?.data?.detail || error.message}`, 'error');
      setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `revert-${snapname}`) }));
    },
  });
};

export const useDeleteSnapshotMutation = (
  auth: Auth, node: string, queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>
) => {
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) =>
      deleteSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket }),
    onMutate: ({ vmid, snapname }) => {
      setPendingActions(prev => ({ ...prev, [vmid]: [...(prev[vmid] || []), `delete-${snapname}`] }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`Deleting snapshot ${snapname} initiated.`, 'success');
      const poll = async () => {
        try {
          const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') addAlert(`Delete snapshot failed: ${t.exitstatus}`, 'error');
            else addAlert(`Snapshot ${snapname} deleted.`, 'success');
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['snapshots', node, vmid] });
              setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`) }));
            }, 5000);
            return;
          }
          setTimeout(poll, 1000);
        } catch {
          addAlert(`Polling delete snapshot failed.`, 'error');
          setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`) }));
        }
      };
      poll();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`Delete ${snapname} failed: ${error.response?.data?.detail || error.message}`, 'error');
      setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `delete-${snapname}`) }));
    },
  });
};

export const useCreateSnapshotMutation = (
  auth: Auth, node: string, queryClient: any,
  addAlert: (message: string, type: string) => void,
  setPendingActions: React.Dispatch<React.SetStateAction<{ [vmid: number]: string[] }>>,
  closeModal: () => void
) => {
  return useMutation({
    mutationFn: ({ vmid, snapname }: { vmid: number; snapname: string }) => {
      if (!snapname || !isValidSnapshotName(snapname)) throw new Error('Invalid snapshot name');
      return createSnapshot({ node, vmid, snapname, csrf: auth.csrf_token, ticket: auth.ticket });
    },
    onMutate: ({ vmid, snapname }) => {
      setPendingActions(prev => ({ ...prev, [vmid]: [...(prev[vmid] || []), `create-${snapname}`] }));
    },
    onSuccess: (upid: string, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`Snapshot ${snapname} initiated.`, 'success');
      const poll = async () => {
        try {
          const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') addAlert(`Snapshot failed: ${t.exitstatus}`, 'error');
            else addAlert(`Snapshot ${snapname} created.`, 'success');
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['snapshots', node, vmid] });
              setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`) }));
            }, 5000);
            return;
          }
          setTimeout(poll, 1000);
        } catch {
          addAlert(`Polling snapshot failed.`, 'error');
          setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`) }));
        }
      };
      poll();
      closeModal();
    },
    onError: (error: any, { vmid, snapname }: { vmid: number; snapname: string }) => {
      addAlert(`Snapshot ${snapname} failed: ${error.response?.data?.detail || error.message}`, 'error');
      setPendingActions(prev => ({ ...prev, [vmid]: (prev[vmid] || []).filter(a => a !== `create-${snapname}`) }));
      closeModal();
    },
  });
};

export const useCreateVMMutation = (
  auth: Auth, queryClient: any,
  addAlert: (message: string, type: string) => void,
  closeModal: () => void
) => {
  return useMutation({
    mutationFn: ({ vmCreate, node }: { vmCreate: VMCreate & { user_data?: string; disk_size?: number; disk_controller?: string }; node: string }) =>
      createVM({ node, vmCreate, csrf: auth.csrf_token, ticket: auth.ticket }),
    onSuccess: (upid: string, { node }: { vmCreate: any; node: string }) => {
      addAlert('VM creation initiated.', 'success');
      const poll = async () => {
        try {
          const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') addAlert(`VM creation failed: ${t.exitstatus}`, 'error');
            else addAlert('VM created successfully.', 'success');
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['vms'] }), 5000);
            return;
          }
          setTimeout(poll, 1000);
        } catch { addAlert('Polling VM creation failed.', 'error'); }
      };
      poll();
      closeModal();
    },
    onError: (error: any) => {
      addAlert(`Error creating VM: ${error.response?.data?.detail || error.message}`, 'error');
      closeModal();
    },
  });
};

// ── OS Catalog ────────────────────────────────────────────────────────────────────────────────

interface OSVersion { id: string; label: string; }
interface OSFamily  { id: string; label: string; versions: OSVersion[]; }

const CATALOG_KEY = 'local-pve-os-catalog';

const DEFAULT_CATALOG: OSFamily[] = [
  { id: 'debian',        label: 'Debian',        versions: [{ id: 'debian-12', label: 'Debian 12' }, { id: 'debian-13', label: 'Debian 13' }] },
  { id: 'ubuntu',        label: 'Ubuntu',        versions: [{ id: 'ubuntu-server-24.04', label: 'Ubuntu Server 24.04' }, { id: 'ubuntu-server-22.04', label: 'Ubuntu Server 22.04' }] },
  { id: 'centos-stream', label: 'CentOS Stream', versions: [{ id: 'centos-stream-9', label: 'CentOS Stream 9' }, { id: 'centos-stream-10', label: 'CentOS Stream 10' }] },
  { id: 'alma',          label: 'Alma',          versions: [{ id: 'alma-9', label: 'Alma 9' }, { id: 'alma-10', label: 'Alma 10' }] },
];

const loadCatalog = (): OSFamily[] => {
  try { const raw = localStorage.getItem(CATALOG_KEY); if (raw) return JSON.parse(raw); } catch { }
  return DEFAULT_CATALOG;
};
const saveCatalog = (c: OSFamily[]) => {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(c)); } catch { }
};

// ── Constants ───────────────────────────────────────────────────────────────────────────────

const NIC_MODELS = ['virtio', 'e1000', 'e1000e', 'rtl8139', 'vmxnet3'];
const CTRL_OPTIONS = ['VirtIO SCSI', 'VirtIO Block', 'SATA', 'IDE'];

// ── Modal ─────────────────────────────────────────────────────────────────────────────────────

interface CreateVMModalProps {
  isOpen: boolean;
  closeModal: () => void;
  auth: Auth;
  node: string;
  queryClient: any;
  addAlert: (message: string, type: string) => void;
}

const CreateVMModal = ({ isOpen, closeModal, auth, node, queryClient, addAlert }: CreateVMModalProps) => {
  const { modalStyle, dragHandleProps, resetPosition } = useDraggable();

  // Identity
  const [vmName,       setVmName]       = useState('');
  const [osVersion,    setOsVersion]    = useState('');
  const [selectedNode, setSelectedNode] = useState(node);
  const [isoMode,      setIsoMode]      = useState<'qcow2' | 'iso'>('qcow2');
  const [isoFile,      setIsoFile]      = useState<File | null>(null);
  const isoFileRef = useRef<HTMLInputElement>(null);

  // Hardware
  const [cpus,           setCpus]           = useState(1);
  const [ram,            setRam]            = useState(2048);
  const [useUEFI,        setUseUEFI]        = useState(false);
  const [diskController, setDiskController] = useState('VirtIO SCSI');
  const [diskSizeGb,     setDiskSizeGb]     = useState(20);
  const [extraDisks,     setExtraDisks]     = useState<{ controller: string; sizeGb: number }[]>([]);
  const [nics,           setNics]           = useState<{ model: string; bridge: string }[]>([{ model: 'virtio', bridge: 'vmbr0' }]);
  const [powerOn,        setPowerOn]        = useState(false);

  // Cloud-init template
  const ciTemplates: { id: string; name: string; targetOS: string; phases: { phase: number; userData: string }[] }[] = (() => {
    try { const r = localStorage.getItem('local-pve-ci-templates'); if (r) return JSON.parse(r); } catch { }
    return [];
  })();
  const [ciTemplateId, setCiTemplateId] = useState('');

  // Add Base OS
  const [addBaseOsOpen, setAddBaseOsOpen] = useState(false);
  const [newOsLabel,    setNewOsLabel]    = useState('');
  const [newOsFile,     setNewOsFile]     = useState<File | null>(null);
  const newOsFileRef = useRef<HTMLInputElement>(null);

  // OS dropdown
  const [osOpen,        setOsOpen]        = useState(false);
  const [hoveredFamily, setHoveredFamily] = useState('');
  const [adminOpen,     setAdminOpen]     = useState(false);
  const osDropdownRef = useRef<HTMLDivElement>(null);

  // Admin form
  const [newFamilyName,      setNewFamilyName]      = useState('');
  const [newVersionFamilyId, setNewVersionFamilyId] = useState('');
  const [newVersionLabel,    setNewVersionLabel]     = useState('');

  // OS catalog
  const [catalog, setCatalog] = useState<OSFamily[]>(loadCatalog);

  // Validation
  const [nameError, setNameError] = useState(true);

  // Node options
  const extraNodes: { name: string; host: string }[] = (() => {
    try { const r = localStorage.getItem('local-pve-nodes'); if (r) return JSON.parse(r); } catch { }
    return [];
  })();
  const localLabel = localStorage.getItem('proxmox_host') || node;
  const nodeOptions = [
    { id: node, label: `${localLabel} (local)` },
    ...extraNodes.map(n => ({ id: n.name, label: `${n.name} — ${n.host}` })),
  ];

  const createVMMutation = useCreateVMMutation(auth, queryClient, addAlert, closeModal);
  const cpuOptions = [1, 2, 4];
  const ramOptions = [512, 1024, 2048, 4096, 8192];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (osDropdownRef.current && !osDropdownRef.current.contains(e.target as Node)) setOsOpen(false);
    };
    if (osOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [osOpen]);

  useEffect(() => {
    if (!osOpen) return;
    const selected = catalog.find(f => f.versions.some(v => v.label === osVersion));
    setHoveredFamily(selected?.id ?? catalog[0]?.id ?? '');
  }, [osOpen]);

  const isValidName = (n: string) => /^[a-zA-Z0-9_-]{1,40}$/.test(n);

  const isFormValid =
    isValidName(vmName) &&
    (isoMode === 'qcow2' ? !!osVersion : isoFile !== null);

  const handleOsSelect = (label: string) => { setOsVersion(label); setOsOpen(false); };

  const handleAddFamily = () => {
    const label = newFamilyName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-');
    if (catalog.some(f => f.id === id)) { addAlert(`Family "${label}" already exists.`, 'warning'); return; }
    const updated = [...catalog, { id, label, versions: [] }];
    setCatalog(updated); saveCatalog(updated); setNewFamilyName('');
    addAlert(`OS family "${label}" added.`, 'success');
  };

  const handleAddVersion = () => {
    const label = newVersionLabel.trim();
    if (!label || !newVersionFamilyId) return;
    const id = label.toLowerCase().replace(/[\s.]/g, '-');
    const updated = catalog.map(f => f.id === newVersionFamilyId ? { ...f, versions: [...f.versions, { id, label }] } : f);
    setCatalog(updated); saveCatalog(updated); setNewVersionLabel('');
    addAlert(`Version "${label}" added.`, 'success');
  };

  const handleAddBaseOs = () => {
    const label = newOsLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[\s.]/g, '-') + '-custom';
    const customFamily = catalog.find(f => f.id === '__custom');
    const updated: OSFamily[] = customFamily
      ? catalog.map(f => f.id === '__custom' ? { ...f, versions: [...f.versions, { id, label }] } : f)
      : [...catalog, { id: '__custom', label: 'Custom', versions: [{ id, label }] }];
    setCatalog(updated); saveCatalog(updated);
    setOsVersion(label); setAddBaseOsOpen(false); setNewOsLabel(''); setNewOsFile(null);
    addAlert(`Base OS "${label}" added to catalog.`, 'success');
  };

  const handleAddDisk = () => {
    setExtraDisks(prev => [...prev, { controller: 'VirtIO SCSI', sizeGb: 20 }]);
  };

  const handleRemoveDisk = (idx: number) => {
    setExtraDisks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddNic = () => {
    setNics(prev => [...prev, { model: 'virtio', bridge: 'vmbr0' }]);
  };

  const handleRemoveNic = (idx: number) => {
    if (nics.length <= 1) return;
    setNics(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidName(vmName)) { setNameError(true); addAlert('VM name: letters, numbers, hyphens, underscores (max 40).', 'error'); return; }
    setNameError(false);
    if (isoMode === 'qcow2' && !osVersion) { addAlert('Please select an OS.', 'error'); return; }
    if (isoMode === 'iso' && !isoFile) { addAlert('Please select an ISO file.', 'error'); return; }

    const chosenTemplate = ciTemplateId ? ciTemplates.find(t => t.id === ciTemplateId) : null;
    const user_data = chosenTemplate ? (chosenTemplate.phases?.[0]?.userData ?? '') : undefined;

    const payload = {
      name: vmName,
      cpus,
      ram,
      source: isoMode === 'qcow2' ? osVersion : (isoFile?.name ?? ''),
      uefi: useUEFI,
      disks: [{ controller: diskController, sizeGb: diskSizeGb }, ...extraDisks],
      nics,
      ciTemplateId,
      powerOn,
      isoMode,
    };

    // Save JSON to downloads
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${vmName}-vm-config.json`; a.click();
    URL.revokeObjectURL(url);

    createVMMutation.mutate({
      vmCreate: {
        name: vmName, cpus, ram,
        source: isoMode === 'qcow2' ? osVersion : (isoFile?.name ?? ''),
        uefi: useUEFI,
        disk_size: diskSizeGb,
        disk_controller: diskController,
        ...(user_data ? { user_data } : {}),
      },
      node: selectedNode,
    });
  };

  const handleClose = () => {
    resetPosition();
    setCiTemplateId(''); setAddBaseOsOpen(false);
    setExtraDisks([]); setNics([{ model: 'virtio', bridge: 'vmbr0' }]);
    setIsoFile(null); setIsoMode('qcow2'); setPowerOn(false);
    closeModal();
  };

  if (!isOpen) return null;

  const fieldBase = 'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const fieldErr  = 'border-red-300';
  const fieldOk   = 'border-gray-300';
  const ctrlSelect = 'flex-none border border-gray-300 rounded-lg px-2 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const adminInput = 'flex-1 border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors';
  const cardCls   = 'bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3.5';
  const cardTitle = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4" style={modalStyle}>

        {/* Header — sticky + draggable */}
        <div
          {...dragHandleProps}
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white rounded-t-2xl cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Server size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Create Virtual Machine</h2>
          </div>
          <button type="button" onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 grid grid-cols-2 gap-4">

            {/* ── Left card: Identity ── */}
            <div className={cardCls}>
              <p className={cardTitle}>Identity</p>

              {/* VM Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">VM Name</label>
                <input type="text" value={vmName} autoFocus
                  onChange={e => { setVmName(e.target.value); setNameError(!isValidName(e.target.value)); }}
                  className={`${fieldBase} ${nameError && vmName !== '' ? fieldErr : fieldOk}`}
                  placeholder="e.g. my-server" />
                {nameError && vmName !== '' && (
                  <p className="mt-1 text-xs text-red-500">Letters, numbers, hyphens, underscores (max 40).</p>
                )}
              </div>

              {/* OS / ISO toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Operating System</label>
                  <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                    <button type="button"
                      onClick={() => setIsoMode('qcow2')}
                      className={`px-2.5 py-1 font-medium transition-colors ${isoMode === 'qcow2' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      qcow2
                    </button>
                    <button type="button"
                      onClick={() => setIsoMode('iso')}
                      className={`px-2.5 py-1 font-medium transition-colors ${isoMode === 'iso' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      ISO
                    </button>
                  </div>
                </div>

                {isoMode === 'qcow2' ? (
                  <>
                    <div className="relative" ref={osDropdownRef}>
                      <button type="button" onClick={() => setOsOpen(v => !v)}
                        className={`${fieldBase} flex items-center justify-between ${fieldOk}`}>
                        <span className={osVersion ? 'text-gray-800' : 'text-gray-400'}>{osVersion || 'Select OS…'}</span>
                        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${osOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {osOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                          <div className="flex" style={{ maxHeight: '200px' }}>
                            <div className="w-2/5 flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
                              {catalog.map(family => (
                                <button key={family.id} type="button"
                                  onMouseEnter={() => setHoveredFamily(family.id)}
                                  onClick={() => setHoveredFamily(family.id)}
                                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 text-xs font-semibold transition-colors
                                    ${hoveredFamily === family.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                  <span className="truncate">{family.label}</span>
                                  <span className="ml-1 text-gray-400">›</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex-1 overflow-y-auto">
                              {(() => {
                                const fam = catalog.find(f => f.id === hoveredFamily);
                                if (!fam) return null;
                                if (!fam.versions.length) return <div className="px-3 py-3 text-xs text-gray-400 italic">No versions yet</div>;
                                return fam.versions.map(ver => (
                                  <button key={ver.id} type="button" onClick={() => handleOsSelect(ver.label)}
                                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors
                                      ${osVersion === ver.label ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                                    {ver.label}
                                  </button>
                                ));
                              })()}
                            </div>
                          </div>

                          {/* Admin section */}
                          <div className="border-t border-gray-200">
                            <button type="button" onClick={() => setAdminOpen(v => !v)}
                              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-colors">
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Admin
                              </span>
                              <svg className={`w-3 h-3 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {adminOpen && (
                              <div className="px-3 pb-3 pt-1 space-y-3 bg-gray-50">
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Add OS Family</p>
                                  <div className="flex gap-1.5">
                                    <input type="text" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFamily(); }}}
                                      placeholder="e.g. Fedora" className={adminInput} />
                                    <button type="button" onClick={handleAddFamily} disabled={!newFamilyName.trim()}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap">
                                      + Add
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Add Version</p>
                                  <div className="flex gap-1.5 mb-1.5">
                                    <select value={newVersionFamilyId} onChange={e => setNewVersionFamilyId(e.target.value)}
                                      className={`${adminInput} flex-none w-28`}>
                                      <option value="">Family…</option>
                                      {catalog.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                    </select>
                                    <input type="text" value={newVersionLabel} onChange={e => setNewVersionLabel(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVersion(); }}}
                                      placeholder="e.g. Fedora 41" className={adminInput} />
                                    <button type="button" onClick={handleAddVersion} disabled={!newVersionLabel.trim() || !newVersionFamilyId}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap">
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

                    {/* Add Base OS */}
                    <button type="button" onClick={() => setAddBaseOsOpen(v => !v)}
                      className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors">
                      <Plus size={11} /> Add Base OS
                    </button>
                    {addBaseOsOpen && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                        <input type="text" value={newOsLabel} onChange={e => setNewOsLabel(e.target.value)}
                          placeholder="OS name e.g. Ubuntu 25.04"
                          className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors" />
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => newOsFileRef.current?.click()}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs border border-blue-200 text-blue-600 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap">
                            <Upload size={11} /> {newOsFile ? newOsFile.name : 'Choose .qcow2 / .img / .raw'}
                          </button>
                          <input ref={newOsFileRef} type="file" accept=".qcow2,.img,.raw" className="hidden"
                            onChange={e => setNewOsFile(e.target.files?.[0] ?? null)} />
                          <button type="button" onClick={handleAddBaseOs} disabled={!newOsLabel.trim()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-md transition-colors">
                            Add
                          </button>
                          <button type="button" onClick={() => { setAddBaseOsOpen(false); setNewOsLabel(''); setNewOsFile(null); }}
                            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-1">
                    <button type="button" onClick={() => isoFileRef.current?.click()}
                      className={`${fieldBase} ${fieldOk} flex items-center gap-2 text-left`}>
                      <Upload size={14} className="text-gray-400 flex-shrink-0" />
                      <span className={isoFile ? 'text-gray-800' : 'text-gray-400'}>
                        {isoFile ? isoFile.name : 'Select .iso file…'}
                      </span>
                    </button>
                    <input ref={isoFileRef} type="file" accept=".iso" className="hidden"
                      onChange={e => setIsoFile(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </div>

              {/* Target Node */}
              {nodeOptions.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Target Node</label>
                  <select value={selectedNode} onChange={e => setSelectedNode(e.target.value)}
                    className={`${fieldBase} ${fieldOk}`}>
                    {nodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                </div>
              )}
            </div>{/* end left card */}

            {/* ── Right card: Hardware ── */}
            <div className={cardCls}>
              <p className={cardTitle}>Hardware</p>

              {/* CPUs */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CPUs</label>
                <select value={cpus} onChange={e => setCpus(parseInt(e.target.value))}
                  className={`${fieldBase} ${fieldOk}`}>
                  {cpuOptions.map(o => <option key={o} value={o}>{o} {o === 1 ? 'core' : 'cores'}</option>)}
                </select>
              </div>

              {/* RAM */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">RAM</label>
                <select value={ram} onChange={e => setRam(parseInt(e.target.value))}
                  className={`${fieldBase} ${fieldOk}`}>
                  {ramOptions.map(o => <option key={o} value={o}>{o >= 1024 ? `${o / 1024} GB` : `${o} MB`}</option>)}
                </select>
              </div>

              {/* UEFI */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">UEFI Boot</p>
                  <p className="text-xs text-gray-400 mt-0.5">OVMF firmware + EFI disk</p>
                </div>
                <button type="button" onClick={() => setUseUEFI(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${useUEFI ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${useUEFI ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                </button>
              </div>
            </div>{/* end right card */}

          </div>{/* end 2-col grid */}

          {/* ── Storage card (full width) ── */}
          <div className="px-5 pb-4">
            <div className={cardCls}>
              <p className={cardTitle}>Storage</p>

              {/* Primary disk */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Primary Disk</label>
                <div className="flex items-center gap-2">
                  <select value={diskController} onChange={e => setDiskController(e.target.value)}
                    className={`${ctrlSelect} w-36`}>
                    {CTRL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input type="number" min={1} max={2000} value={diskSizeGb} onChange={e => setDiskSizeGb(parseInt(e.target.value) || 20)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors text-right" />
                  <span className="text-sm text-gray-500 flex-shrink-0">GB</span>
                </div>
              </div>

              {/* Extra disks */}
              {extraDisks.map((disk, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={disk.controller} onChange={e => setExtraDisks(prev => prev.map((d, i) => i === idx ? { ...d, controller: e.target.value } : d))}
                    className={`${ctrlSelect} w-36`}>
                    {CTRL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input type="number" min={1} max={2000} value={disk.sizeGb} onChange={e => setExtraDisks(prev => prev.map((d, i) => i === idx ? { ...d, sizeGb: parseInt(e.target.value) || 20 } : d))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors text-right" />
                  <span className="text-sm text-gray-500 flex-shrink-0">GB</span>
                  <button type="button" onClick={() => handleRemoveDisk(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button" onClick={handleAddDisk}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <Plus size={13} /> Add Disk
              </button>
            </div>
          </div>

          {/* ── Networking card (full width) ── */}
          <div className="px-5 pb-4">
            <div className={cardCls}>
              <p className={cardTitle}>Networking</p>

              {nics.map((nic, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={nic.model} onChange={e => setNics(prev => prev.map((n, i) => i === idx ? { ...n, model: e.target.value } : n))}
                    className={`${ctrlSelect} w-32`}>
                    {NIC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="text" value={nic.bridge} onChange={e => setNics(prev => prev.map((n, i) => i === idx ? { ...n, bridge: e.target.value } : n))}
                    placeholder="vmbr0"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors" />
                  <button type="button" onClick={() => handleRemoveNic(idx)}
                    disabled={nics.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button type="button" onClick={handleAddNic}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <Plus size={13} /> Add NIC
              </button>
            </div>
          </div>

          {/* ── Cloud-Init card (full width, only if templates exist) ── */}
          {ciTemplates.length > 0 && (
            <div className="px-5 pb-4">
              <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center flex-shrink-0">
                    <FileCode size={11} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Cloud-Init Template</p>
                </div>
                <select value={ciTemplateId} onChange={e => setCiTemplateId(e.target.value)}
                  className={`${fieldBase} ${fieldOk}`}>
                  <option value="">Use OS default script</option>
                  {ciTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.targetOS ? ` — ${t.targetOS}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Bottom bar ── */}
          <div className="flex items-center justify-between px-5 pb-5 gap-3">
            {/* Power On toggle */}
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => setPowerOn(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${powerOn ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${powerOn ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
              </button>
              <span className="text-xs font-medium text-gray-600">Power on after create</span>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!isFormValid || createVMMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {createVMMutation.isPending ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : 'Create VM'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVMModal;
