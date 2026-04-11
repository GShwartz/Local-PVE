import { useState, useRef, useMemo, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../../api';
import { Server, Upload, FileCode, Check, Globe, HardDrive, ChevronDown, ShieldCheck } from 'lucide-react';
import { Auth, TaskStatus, VMCreate } from '../../../types';
import { useDraggable } from '../../../hooks/useDraggable';
import OsDropdown from './OsDropdown';
import StorageCard from './StorageCard';
import NetworkingCard from './NetworkingCard';
import PasswordCard from './PasswordCard';
import CloudInitCard from './CloudInitCard';
import SSHKeyCard from './SSHKeyCard';
import InstanceIdentityCard from './InstanceIdentityCard';

// ── API helpers ──────────────────────────────────────────────────────────────

const createVM = async ({ 
  node, 
  vmCreate, 
}: { 
  node: string; 
  vmCreate: VMCreate; 
}): Promise<string> => {
  const { data } = await api.post<string>(`/vm/${node}`, vmCreate);
  return data;
};

const saveVMConfig = async (userDir: string, config: any) => {
  const { data } = await api.post<{ saved: string; path: string }>(
    `/user/${userDir}/vm-configs`, 
    config
  );
  return data;
};

// ── Mutation hook ────────────────────────────────────────────────────────────

const useCreateVMMutation = (
  queryClient: any,
  addAlert: (message: string, type: string) => void
) => {
  return useMutation<string, any, { vmCreate: VMCreate; node: string }>({
    mutationFn: ({ vmCreate, node }) => createVM({ node, vmCreate }),
    onSuccess: (upid, { node, vmCreate }) => {
      const poll = async () => {
        try {
          const { data: t } = await api.get<TaskStatus>(`/task/${node}/${upid}`);
          if (t.status === 'stopped') {
            if (t.exitstatus !== 'OK') {
              addAlert(`Deployment of ${vmCreate.name} failed: ${t.exitstatus}`, 'error');
            } else {
              addAlert(`${vmCreate.name} deployed successfully.`, 'success');
              queryClient.invalidateQueries({ queryKey: ['vms'] });
            }
            return;
          }
          setTimeout(poll, 1500);
        } catch { 
          addAlert(`Polling failed for ${vmCreate.name}`, 'error'); 
        }
      };
      poll();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || error.message || 'Unknown error';
      addAlert(`Deployment error: ${msg}`, 'error');
    },
  });
};

// ── Modal ────────────────────────────────────────────────────────────────────

interface CreateVMModalProps {
  isOpen: boolean;
  closeModal: () => void;
  auth: Auth;
  node: string;
  queryClient: any;
  addAlert: (message: string, type: string) => void;
  onNavigateToCloudInit: () => void;
}

const CreateVMModal = ({ 
  isOpen, 
  closeModal, 
  auth, 
  node, 
  queryClient, 
  addAlert, 
  onNavigateToCloudInit 
}: CreateVMModalProps) => {
  const { modalStyle, dragHandleProps, resetPosition } = useDraggable();

  // --- Identity State ---
  const [vmName, setVmName] = useState('');
  const [instanceCount, setInstanceCount] = useState(1);
  const [osVersion, setOsVersion] = useState('');
  const [selectedNode, setSelectedNode] = useState(node);
  const [isoMode, setIsoMode] = useState<'qcow2' | 'iso'>('qcow2');
  const [isoFile, setIsoFile] = useState<File | null>(null);
  const isoFileRef = useRef<HTMLInputElement>(null);

  // --- Hardware State ---
  const [cpus, setCpus] = useState(1);
  const [ram, setRam] = useState(2048);
  const [useUEFI, setUseUEFI] = useState(false);
  const [serialPort, setSerialPort] = useState(false);
  const [diskController, setDiskController] = useState('VirtIO SCSI');
  const [diskSizeGb, setDiskSizeGb] = useState(20);
  const [extraDisks, setExtraDisks] = useState<{ controller: string; sizeGb: number }[]>([]);
  const [nics, setNics] = useState<{ model: string; bridge: string }[]>([{ model: 'virtio', bridge: 'vmbr0' }]);
  const [powerOn, setPowerOn] = useState(false);

  // --- Security State ---
  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [sshKey, setSshKey] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);

  // --- Templates & Options ---
  const ciTemplates: any[] = useMemo(() => {
    try { const r = localStorage.getItem('local-pve-ci-templates'); if (r) return JSON.parse(r); } catch { }
    return [];
  }, []);
  const [ciTemplateId, setCiTemplateId] = useState('');
  const [nameError, setNameError] = useState(true);

  const nodeOptions = useMemo(() => {
    try { 
      const r = localStorage.getItem('local-pve-nodes'); 
      const extraNodes = r ? JSON.parse(r) : [];
      const localLabel = localStorage.getItem('proxmox_host') || node;
      const options = [{ id: node, label: `${localLabel} (local)` }];
      if (Array.isArray(extraNodes)) {
        extraNodes.forEach((n: any) => {
          if (n && n.name && n.name !== node) {
            options.push({ id: n.name, label: `${n.name} — ${n.host}` });
          }
        });
      }
      return options;
    } catch { return [{ id: node, label: `${node} (local)` }]; }
  }, [node]);

  const createVMMutation = useCreateVMMutation(queryClient, addAlert);
  const cpuOptions = [1, 2, 4];
  const ramOptions = [512, 1024, 2048, 4096, 8192];

  const isValidName = (n: string) => /^[a-zA-Z0-9_-]{1,40}$/.test(n);
  
  const isFormValid = useMemo(() => {
    const hasValidName = isValidName(vmName);
    const hasSelectedImage = isoMode === 'qcow2' ? !!osVersion : !!isoFile;
    const passwordOk = password === '' || isPasswordValid;
    return hasValidName && hasSelectedImage && passwordOk && !createVMMutation.isPending;
  }, [vmName, isoMode, osVersion, isoFile, password, isPasswordValid, createVMMutation.isPending]);

  const handleClose = () => {
    resetPosition();
    setVmName('');
    setInstanceCount(1);
    setCiTemplateId(''); setExtraDisks([]); setNics([{ model: 'virtio', bridge: 'vmbr0' }]);
    setIsoFile(null); setIsoMode('qcow2'); setPowerOn(false); setPassword(''); setSshKey('');
    setSerialPort(false); setOptionalOpen(false);
    closeModal();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) handleClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const chosenTemplate = ciTemplateId ? ciTemplates.find(t => t.id === ciTemplateId) : null;
    const user_data = chosenTemplate ? (chosenTemplate.phases?.[0]?.userData ?? '') : undefined;

    // ── Generate instance list ───────────────────────────────────────────────
    const generatedInstances = Array.from({ length: instanceCount }, (_, i) => {
      const idx = i + 1;
      return instanceCount > 1 ? `${vmName}-${idx}` : vmName;
    });

    const fullConfig = {
      naming: {
        hostnameBase: vmName,
        totalInstances: instanceCount,
        instances: generatedInstances
      },
      deploymentTarget: {
        node: selectedNode,
        timestamp: new Date().toISOString()
      },
      computeResources: {
        vCPUs: cpus,
        memoryMB: ram,
        uefiSecureBoot: useUEFI,
        serialPortEnabled: serialPort,
        autoStartAfterDeploy: powerOn
      },
      storageConfiguration: {
        primaryController: diskController,
        bootDiskSizeGB: diskSizeGb,
        additionalDisks: extraDisks.map(d => ({
          controller: d.controller,
          sizeGB: d.sizeGb
        }))
      },
      networkConfiguration: {
        interfaces: nics.map((n, idx) => ({
          id: `net${idx}`,
          model: n.model,
          bridge: n.bridge
        }))
      },
      osConfiguration: {
        installationMode: isoMode,
        imageSource: isoMode === 'qcow2' ? osVersion : (isoFile?.name ?? 'manual_iso')
      },
      securityAndInit: {
        ciTemplateId: ciTemplateId || "none",
        passwordProvisioned: !!password,
        sshKeysProvisioned: !!sshKey
      }
    };

    try {
      const userDir = `user_${auth.username}`;
      await saveVMConfig(userDir, fullConfig);
    } catch (err) {
      console.error("Configuration history save failed", err);
    }

    // ── Deployment Loop ──────────────────────────────────────────────────────
    for (const finalName of generatedInstances) {
      const payload: any = {
        name: finalName, 
        cpus, 
        ram,
        source: isoMode === 'qcow2' ? osVersion : (isoFile?.name ?? ''),
        uefi: useUEFI,
        serial0: serialPort ? 'socket' : undefined,
        disk_size: diskSizeGb,
        disk_controller: diskController,
        password: password || undefined,
        ssh_key: sshKey || undefined,
        ...(user_data ? { user_data } : {}),
      };

      createVMMutation.mutate({
        vmCreate: payload as VMCreate,
        node: selectedNode,
      });

      if (instanceCount > 1) await new Promise(r => setTimeout(r, 400));
    }

    addAlert(`Deployment of ${instanceCount} instance(s) initiated`, 'success');
    handleClose();
  };

  if (!isOpen) return null;

  const fieldBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border-gray-200 shadow-sm';
  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2';

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-start justify-center z-50 overflow-y-auto pt-3 pb-12 text-left"
      onClick={handleClose}
    >
      <div 
        className="bg-[#f8fafc] rounded-3xl shadow-2xl border border-white/20 w-full max-w-7xl mx-4 overflow-hidden" 
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div {...dragHandleProps} className="top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Server size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Deploy New Instance</h2>
              <p className="text-xs text-gray-500 font-medium">Configure your virtual machine resources</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-3">
              
              <InstanceIdentityCard 
                vmName={vmName}
                setVmName={setVmName}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                nodeOptions={nodeOptions}
                nameError={nameError}
                setNameError={setNameError}
                isValidName={isValidName}
                instanceCount={instanceCount}
                setInstanceCount={setInstanceCount}
              />

              <div className={cardCls}>
                <p className={cardTitle}><FileCode size={12}/> Operating System Source</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <button type="button" onClick={() => setIsoMode('qcow2')} 
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isoMode === 'qcow2' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-2 rounded-lg ${isoMode === 'qcow2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                      <FileCode size={18} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isoMode === 'qcow2' ? 'text-blue-900' : 'text-gray-700'}`}>Cloud Image</p>
                      <p className="text-[10px] text-gray-500 font-medium">Fast-boot qcow2</p>
                    </div>
                    {isoMode === 'qcow2' && <Check size={16} className="ml-auto text-blue-600" />}
                  </button>

                  <button type="button" onClick={() => setIsoMode('iso')} 
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isoMode === 'iso' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'}`}>
                    <div className={`p-2 rounded-lg ${isoMode === 'iso' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isoMode === 'iso' ? 'text-gray-700' : 'text-gray-700'}`}>ISO File</p>
                      <p className="text-[10px] text-gray-500 font-medium">Manual install</p>
                    </div>
                    {isoMode === 'iso' && <Check size={16} className="ml-auto text-blue-600" />}
                  </button>
                </div>

                {isoMode === 'qcow2' ? (
                  <div className="relative animate-in fade-in slide-in-from-top-2">
                    <OsDropdown value={osVersion} onSelect={setOsVersion} addAlert={addAlert} />
                  </div>
                ) : (
                  <div className="mt-1 animate-in fade-in slide-in-from-top-2">
                    <button type="button" onClick={() => isoFileRef.current?.click()} className={`${fieldBase} border-dashed border-2 py-8 flex flex-col items-center justify-center gap-2 group hover:bg-blue-50/50 hover:border-blue-300`}>
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Upload size={20} className="text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <span className={isoFile ? 'text-sm font-bold text-gray-900' : 'text-sm font-medium text-gray-400'}>
                        {isoFile ? isoFile.name : 'Select or drop .iso image'}
                      </span>
                    </button>
                    <input ref={isoFileRef} type="file" accept=".iso" className="hidden" onChange={e => setIsoFile(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <StorageCard 
                  diskController={diskController} setDiskController={setDiskController} 
                  diskSizeGb={diskSizeGb} setDiskSizeGb={setDiskSizeGb} 
                  extraDisks={extraDisks} setExtraDisks={setExtraDisks} 
                />
                <NetworkingCard nics={nics} setNics={setNics} />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className={cardCls}>
                <p className={cardTitle}><HardDrive size={12}/> Resource Allocation</p>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Compute Power</label>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{cpus} vCPU</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        {cpuOptions.map(o => (
                          <button key={o} type="button" onClick={() => setCpus(o)}
                            className={`py-2 text-sm font-bold rounded-xl border transition-all ${cpus === o ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                            {o} {o === 1 ? 'Core' : 'Cores'}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input type="number" min="1" value={cpus} onChange={(e) => setCpus(parseInt(e.target.value) || 1)} className={`${fieldBase} pl-9`} placeholder="Custom..." />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">#</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Memory (RAM)</label>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {ram >= 1024 ? `${(ram / 1024).toFixed(1)} GB` : `${ram} MB`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-3 gap-2">
                        {ramOptions.map(o => (
                          <button key={o} type="button" onClick={() => setRam(o)}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all ${ram === o ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                            {o >= 1024 ? `${o / 1024} GB` : `${o} MB`}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input type="number" min="128" step="128" value={ram} onChange={(e) => setRam(parseInt(e.target.value) || 0)} className={`${fieldBase} pl-9`} placeholder="Custom MB..." />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">UEFI Secure Boot</p>
                        <p className="text-[10px] text-gray-400 font-medium">Modern OS support</p>
                      </div>
                      <button type="button" onClick={() => setUseUEFI(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useUEFI ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useUEFI ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Serial Port (0)</p>
                        <p className="text-[10px] text-gray-400 font-medium">For xterm.js console</p>
                      </div>
                      <button type="button" onClick={() => setSerialPort(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${serialPort ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${serialPort ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">Auto-Start</p>
                        <p className="text-[10px] text-gray-400 font-medium">Power on after deploy</p>
                      </div>
                      <button type="button" onClick={() => setPowerOn(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${powerOn ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${powerOn ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <button type="button" onClick={() => setOptionalOpen(!optionalOpen)} className="w-full flex items-center justify-between group focus:outline-none">
                  <p className={cardTitle}><ShieldCheck size={12}/> Optional Configuration</p>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${optionalOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${optionalOpen ? 'max-h-[1000px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CloudInitCard value={ciTemplateId} onChange={setCiTemplateId} onNavigateToCloudInit={onNavigateToCloudInit} />
                    <PasswordCard onPasswordChange={(pass, valid) => { setPassword(pass); setIsPasswordValid(valid); }} />
                  </div>
                  <div className="mt-4">
                    <SSHKeyCard sshKey={sshKey} onSSHKeyChange={setSshKey} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end px-8 py-6 bg-white border-t border-gray-100 gap-3">
            <button type="button" onClick={handleClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200">Discard</button>
            <button type="submit" disabled={!isFormValid} 
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95">
              {createVMMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Deploying...
                </div>
              ) : `Deploy ${instanceCount > 1 ? `${instanceCount} Instances` : 'Instance'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVMModal;
