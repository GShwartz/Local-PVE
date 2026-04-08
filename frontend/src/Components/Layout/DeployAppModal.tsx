import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Trash2, X, Zap } from 'lucide-react';
import { Auth, TaskStatus, VMCreate } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';

const API_BASE = 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────────────────────

interface AppDef {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultOS: string;
  icon: string;
  helperScript: string;
}

interface CustomApp {
  id: string;
  name: string;
  category: string;
  baseOS: string;
  ciTemplateId: string;
}

interface DeployAppModalProps {
  isOpen: boolean;
  closeModal: () => void;
  auth: Auth;
  node: string;
  queryClient: any;
  addAlert: (message: string, type: string) => void;
}

// ── Predefined apps ───────────────────────────────────────────────────────────────────────────

const PREDEFINED_APPS: AppDef[] = [
  // Web
  {
    id: 'nginx', name: 'Nginx', category: 'Web', description: 'High-performance web server & reverse proxy',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - nginx\nruncmd:\n  - systemctl enable --now nginx\n',
  },
  {
    id: 'caddy', name: 'Caddy', category: 'Web', description: 'Modern web server with automatic HTTPS',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\nruncmd:\n  - apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl\n  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg\n  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list\n  - apt-get update\n  - apt-get install -y caddy\n  - systemctl enable --now caddy\n',
  },
  // Database
  {
    id: 'postgresql', name: 'PostgreSQL', category: 'Database', description: 'Advanced open-source relational database',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - postgresql\n  - postgresql-contrib\nruncmd:\n  - systemctl enable --now postgresql\n',
  },
  {
    id: 'mysql', name: 'MySQL', category: 'Database', description: 'Popular open-source relational database',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - mysql-server\nruncmd:\n  - systemctl enable --now mysql\n',
  },
  {
    id: 'redis', name: 'Redis', category: 'Database', description: 'In-memory data store & message broker',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - redis-server\nruncmd:\n  - systemctl enable --now redis-server\n',
  },
  {
    id: 'mariadb', name: 'MariaDB', category: 'Database', description: 'Community-developed fork of MySQL',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - mariadb-server\nruncmd:\n  - systemctl enable --now mariadb\n',
  },
  // DevOps
  {
    id: 'docker', name: 'Docker', category: 'DevOps', description: 'Container platform for application deployment',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\nruncmd:\n  - curl -fsSL https://get.docker.com | sh\n  - systemctl enable --now docker\n  - usermod -aG docker ubuntu\n',
  },
  {
    id: 'k3s', name: 'K3s', category: 'DevOps', description: 'Lightweight Kubernetes for edge & IoT',
    defaultOS: 'Ubuntu Server 24.04', icon: '⚙️',
    helperScript: '#cloud-config\npackage_update: true\nruncmd:\n  - curl -sfL https://get.k3s.io | sh -\n',
  },
  {
    id: 'gitlab-runner', name: 'GitLab Runner', category: 'DevOps', description: 'CI/CD runner for GitLab pipelines',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\nruncmd:\n  - curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | bash\n  - apt-get install -y gitlab-runner\n',
  },
  // Monitoring
  {
    id: 'grafana', name: 'Grafana', category: 'Monitoring', description: 'Analytics & monitoring visualization platform',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\nruncmd:\n  - apt-get install -y apt-transport-https software-properties-common wget\n  - wget -q -O /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key\n  - echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list\n  - apt-get update\n  - apt-get install -y grafana\n  - systemctl enable --now grafana-server\n',
  },
  {
    id: 'prometheus', name: 'Prometheus', category: 'Monitoring', description: 'Systems monitoring & alerting toolkit',
    defaultOS: 'Ubuntu Server 24.04', icon: '',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - prometheus\nruncmd:\n  - systemctl enable --now prometheus\n',
  },
  // Utilities
  {
    id: 'pihole', name: 'Pi-hole', category: 'Utilities', description: 'Network-level ad & tracker blocking',
    defaultOS: 'Debian 12', icon: '️',
    helperScript: '#cloud-config\npackage_update: true\nruncmd:\n  - curl -sSL https://install.pi-hole.net | bash /dev/stdin --unattended\n',
  },
  {
    id: 'nextcloud', name: 'Nextcloud', category: 'Utilities', description: 'Self-hosted file sync & collaboration',
    defaultOS: 'Ubuntu Server 24.04', icon: '☁️',
    helperScript: '#cloud-config\npackage_update: true\npackages:\n  - snap\nruncmd:\n  - snap install nextcloud\n',
  },
];

const CATEGORIES = ['Web', 'Database', 'DevOps', 'Monitoring', 'Utilities', 'Custom'];

const CUSTOM_APPS_KEY = 'local-pve-custom-apps';
const loadCustomApps = (): CustomApp[] => {
  try { const r = localStorage.getItem(CUSTOM_APPS_KEY); if (r) return JSON.parse(r); } catch { }
  return [];
};
const saveCustomApps = (apps: CustomApp[]) => {
  try { localStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(apps)); } catch { }
};

// ── OS Catalog helpers ─────────────────────────────────────────────────────────────────────────────

interface OSVersion { id: string; label: string; }
interface OSFamily  { id: string; label: string; versions: OSVersion[]; }

const DEFAULT_OS_LIST = ['Ubuntu Server 24.04', 'Ubuntu Server 22.04', 'Debian 12', 'Debian 13', 'CentOS Stream 9', 'CentOS Stream 10', 'Alma 9', 'Alma 10'];

const loadOSList = (): string[] => {
  try {
    const raw = localStorage.getItem('local-pve-os-catalog');
    if (raw) {
      const catalog = JSON.parse(raw) as OSFamily[];
      return catalog.flatMap(f => f.versions.map(v => v.label));
    }
  } catch { }
  return DEFAULT_OS_LIST;
};

// ── Deploy mutation ────────────────────────────────────────────────────────────────────────────────

const useDeployMutation = (
  auth: Auth, queryClient: any,
  addAlert: (msg: string, type: string) => void,
  closeModal: () => void
) => {
  return useMutation({
    mutationFn: async ({ vmCreate, node, powerOn }: { vmCreate: VMCreate & { user_data?: string }; node: string; powerOn: boolean }) => {
      const { data: upid } = await axios.post<string>(
        `${API_BASE}/vm/${node}`, vmCreate,
        { headers: { 'CSRFPreventionToken': auth.csrf_token }, params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
      );
      if (powerOn) {
        const pollAndStart = async (retries = 30) => {
          try {
            const { data: t } = await axios.get<TaskStatus>(`${API_BASE}/task/${node}/${upid}`,
              { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } });
            if (t.status === 'stopped') {
              if (t.exitstatus === 'OK') {
                await axios.post(`${API_BASE}/vm/${node}/${vmCreate.name}/start`, {},
                  { headers: { 'CSRFPreventionToken': auth.csrf_token }, params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
                );
                addAlert('VM deployed and started.', 'success');
              }
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              return;
            }
            if (retries > 0) setTimeout(() => pollAndStart(retries - 1), 2000);
          } catch { /* ignore start errors */ }
        };
        setTimeout(() => pollAndStart(), 3000);
      }
      return upid;
    },
    onSuccess: () => {
      addAlert('Deployment initiated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['vms'] });
      closeModal();
    },
    onError: (error: any) => {
      addAlert(`Deploy failed: ${error.response?.data?.detail || error.message}`, 'error');
      closeModal();
    },
  });
};

// ── Component ─────────────────────────────────────────────────────────────────────────────────

const DeployAppModal = ({ isOpen, closeModal, auth, node, queryClient, addAlert }: DeployAppModalProps) => {
  const { modalStyle, dragHandleProps, resetPosition } = useDraggable();
  const osList = loadOSList();

  // CI templates from localStorage
  const ciTemplates: { id: string; name: string; targetOS: string; phases: { phase: number; userData: string }[] }[] = (() => {
    try { const r = localStorage.getItem('local-pve-ci-templates'); if (r) return JSON.parse(r); } catch { }
    return [];
  })();

  // Custom apps
  const [customApps, setCustomApps] = useState<CustomApp[]>(loadCustomApps);

  // Navigation
  const [activeCategory, setActiveCategory] = useState('Web');
  const [selectedAppId, setSelectedAppId]   = useState<string | null>(null);

  // Deployment config
  const [vmName,       setVmName]       = useState('');
  const [baseOS,       setBaseOS]       = useState('');
  const [selectedNode, setSelectedNode] = useState(node);
  const [ciTemplateId, setCiTemplateId] = useState('');
  const [powerOn,      setPowerOn]      = useState(true);

  // Add custom app form (shown in Panel 3 when category === 'Custom')
  const [newAppName,       setNewAppName]       = useState('');
  const [newAppBaseOS,     setNewAppBaseOS]     = useState(osList[0] ?? '');
  const [newAppCiTemplate, setNewAppCiTemplate] = useState('');
  const [deletingId,       setDeletingId]       = useState<string | null>(null);

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

  const deployMutation = useDeployMutation(auth, queryClient, addAlert, closeModal);

  // Derived
  const allApps = [
    ...PREDEFINED_APPS,
    ...customApps.map(a => ({
      id: a.id, name: a.name, category: 'Custom',
      description: `Custom app — ${a.baseOS}`,
      defaultOS: a.baseOS, icon: '',
      helperScript: ciTemplates.find(t => t.id === a.ciTemplateId)?.phases?.[0]?.userData ?? '',
    })),
  ];

  const filteredApps = allApps.filter(a => a.category === activeCategory);
  const selectedApp  = allApps.find(a => a.id === selectedAppId) ?? null;

  const handleSelectApp = (id: string) => {
    const app = allApps.find(a => a.id === id);
    if (!app) return;
    setSelectedAppId(id);
    setVmName(app.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    setBaseOS(app.defaultOS);
    setCiTemplateId('');
  };

  const handleAddCustomApp = () => {
    if (!newAppName.trim()) return;
    const app: CustomApp = {
      id: `custom-${Date.now()}`,
      name: newAppName.trim(),
      category: 'Custom',
      baseOS: newAppBaseOS,
      ciTemplateId: newAppCiTemplate,
    };
    const updated = [...customApps, app];
    setCustomApps(updated); saveCustomApps(updated);
    setNewAppName(''); setNewAppBaseOS(osList[0] ?? ''); setNewAppCiTemplate('');
    addAlert(`Custom app "${app.name}" added.`, 'success');
    handleSelectApp(app.id);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customApps.filter(a => a.id !== id);
    setCustomApps(updated); saveCustomApps(updated);
    if (selectedAppId === id) { setSelectedAppId(null); setVmName(''); setBaseOS(''); }
    setDeletingId(null);
  };

  const handleDeploy = () => {
    if (!selectedApp) { addAlert('Select an application to deploy.', 'error'); return; }
    if (!vmName.trim()) { addAlert('Enter a VM name.', 'error'); return; }

    const chosenTemplate = ciTemplateId ? ciTemplates.find(t => t.id === ciTemplateId) : null;
    const user_data = chosenTemplate
      ? (chosenTemplate.phases?.[0]?.userData ?? '')
      : selectedApp.helperScript || undefined;

    deployMutation.mutate({
      vmCreate: { name: vmName.trim(), cpus: 2, ram: 2048, source: baseOS, uefi: false, ...(user_data ? { user_data } : {}) },
      node: selectedNode,
      powerOn,
    });
  };

  const handleClose = () => {
    resetPosition();
    setSelectedAppId(null); setVmName(''); setBaseOS('');
    setCiTemplateId(''); setPowerOn(true);
    setNewAppName(''); setNewAppBaseOS(osList[0] ?? ''); setNewAppCiTemplate('');
    closeModal();
  };

  if (!isOpen) return null;

  const fieldBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const labelCls  = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  // Panel height for overflow control
  const PANEL_H = 520;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl mx-4 overflow-hidden" style={modalStyle}>

        {/* Header — draggable */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Deploy Application</h2>
          </div>
          <button type="button" onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* 3-panel body */}
        <div className="flex overflow-hidden" style={{ height: PANEL_H }}>

          {/* Panel 1 — Category tabs (narrow left column) */}
          <div className="w-48 flex-shrink-0 border-r border-gray-100 bg-gray-50 flex flex-col overflow-hidden">
            <p className="px-4 pt-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Categories</p>
            <div className="flex-1 overflow-y-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSelectedAppId(null); setVmName(''); setBaseOS(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                    ${activeCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Panel 2 — App list */}
          <div className="w-56 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
            <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{activeCategory}</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-0.5">
              {filteredApps.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs px-3">No apps in this category</div>
              ) : (
                filteredApps.map(app => {
                  const isCustom = customApps.some(c => c.id === app.id);
                  return (
                    <div
                      key={app.id}
                      onClick={() => handleSelectApp(app.id)}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                        ${selectedAppId === app.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'}`}
                    >
                      <span className="text-base flex-shrink-0">{app.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${selectedAppId === app.id ? 'text-blue-700' : 'text-gray-800'}`}>
                          {app.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{app.description}</p>
                      </div>
                      {isCustom && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (deletingId === app.id) handleDeleteCustom(app.id, e);
                            else setDeletingId(app.id);
                          }}
                          title={deletingId === app.id ? 'Click again to confirm' : 'Remove'}
                          className={`opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 transition-all
                            ${deletingId === app.id ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Panel 3 — Config */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedApp ? (
              <>
                {/* App info header */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedApp.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{selectedApp.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedApp.description}</p>
                    </div>
                  </div>
                </div>

                {/* Config fields */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">

                  <div>
                    <label className={labelCls}>VM Name</label>
                    <input type="text" value={vmName} onChange={e => setVmName(e.target.value)}
                      className={fieldBase} placeholder="e.g. nginx-prod" />
                  </div>

                  <div>
                    <label className={labelCls}>Base OS</label>
                    <select value={baseOS} onChange={e => setBaseOS(e.target.value)} className={fieldBase}>
                      {osList.map(os => <option key={os} value={os}>{os}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Cloud-Init Template</label>
                    {ciTemplates.length > 0 ? (
                      <select value={ciTemplateId} onChange={e => setCiTemplateId(e.target.value)} className={fieldBase}>
                        <option value="">Use app default script</option>
                        {ciTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}{t.targetOS ? ` — ${t.targetOS}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 text-center">
                        No CI templates — using app default script
                      </div>
                    )}
                  </div>

                  {nodeOptions.length > 1 && (
                    <div>
                      <label className={labelCls}>Target Node</label>
                      <select value={selectedNode} onChange={e => setSelectedNode(e.target.value)} className={fieldBase}>
                        {nodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Custom category: Add Custom App form in panel 3 */}
                  {activeCategory === 'Custom' && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Custom App</p>
                      <div className="space-y-2.5">
                        <input type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)}
                          placeholder="App name"
                          className={fieldBase} />
                        <div>
                          <label className={labelCls}>Base OS</label>
                          <select value={newAppBaseOS} onChange={e => setNewAppBaseOS(e.target.value)} className={fieldBase}>
                            {osList.map(os => <option key={os} value={os}>{os}</option>)}
                          </select>
                        </div>
                        {ciTemplates.length > 0 && (
                          <div>
                            <label className={labelCls}>CI Template</label>
                            <select value={newAppCiTemplate} onChange={e => setNewAppCiTemplate(e.target.value)} className={fieldBase}>
                              <option value="">None</option>
                              {ciTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        )}
                        <button onClick={handleAddCustomApp} disabled={!newAppName.trim()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg transition-colors">
                          <Plus size={13} /> Add App
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom action bar */}
                <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
                  {/* Power On toggle */}
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => setPowerOn(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${powerOn ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${powerOn ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                    <span className="text-xs font-medium text-gray-600">Power on after deploy</span>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleDeploy} disabled={deployMutation.isPending || !vmName.trim() || !selectedApp}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                      {deployMutation.isPending ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : <><Zap size={14} /> Deploy</>}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* No app selected placeholder */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Zap size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select an app to configure deployment</p>
                <p className="text-xs text-gray-400">Choose from the list on the left</p>

                {/* Custom category: show add form even without selected app */}
                {activeCategory === 'Custom' && (
                  <div className="w-full max-w-xs mt-4 space-y-2.5 text-left">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Custom App</p>
                    <input type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)}
                      placeholder="App name"
                      className={fieldBase} />
                    <div>
                      <label className={labelCls}>Base OS</label>
                      <select value={newAppBaseOS} onChange={e => setNewAppBaseOS(e.target.value)} className={fieldBase}>
                        {osList.map(os => <option key={os} value={os}>{os}</option>)}
                      </select>
                    </div>
                    {ciTemplates.length > 0 && (
                      <div>
                        <label className={labelCls}>CI Template</label>
                        <select value={newAppCiTemplate} onChange={e => setNewAppCiTemplate(e.target.value)} className={fieldBase}>
                          <option value="">None</option>
                          {ciTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    )}
                    <button onClick={handleAddCustomApp} disabled={!newAppName.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg transition-colors">
                      <Plus size={13} /> Add App
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeployAppModal;
