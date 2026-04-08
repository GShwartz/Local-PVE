import { useState, type ReactNode } from 'react';
import { Server, Database, ShieldAlert, Save, RefreshCw, Check, Network, Plus, Trash2, X, Download, type LucideIcon } from 'lucide-react';

interface SettingsViewProps {
  addAlert: (message: string, type: string) => void;
}

const Section = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
      <Icon size={16} className="text-blue-500" />
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Field = ({
  label, description, children,
}: { label: string; description?: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-8 py-3 border-b border-gray-50 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

interface PVENode { name: string; host: string; port: string; username: string; }
interface Datastore { id: string; name: string; path: string; type: string; node: string; }

const NODES_KEY      = 'local-pve-nodes';
const DATASTORES_KEY = 'local-pve-datastores';

const loadNodes = (): PVENode[] => {
  try { const raw = localStorage.getItem(NODES_KEY); if (raw) return JSON.parse(raw); } catch { /**/ }
  return [];
};
const saveNodes = (nodes: PVENode[]) => {
  try { localStorage.setItem(NODES_KEY, JSON.stringify(nodes)); } catch { /**/ }
};

const loadDatastores = (): Datastore[] => {
  try { const raw = localStorage.getItem(DATASTORES_KEY); if (raw) return JSON.parse(raw); } catch { /**/ }
  return [];
};
const saveDatastores = (ds: Datastore[]) => {
  try { localStorage.setItem(DATASTORES_KEY, JSON.stringify(ds)); } catch { /**/ }
};

const DS_TYPES = ['dir', 'nfs', 'lvm', 'zfs'];

const SettingsView = ({ addAlert }: SettingsViewProps) => {
  const [proxmoxHost, setProxmoxHost] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('proxmox_host') || 'pve.home.lab' : 'pve.home.lab'
  );
  const [proxmoxPort, setProxmoxPort] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('proxmox_port') || '8006' : '8006'
  );
  const [verifySSL,        setVerifySSL]        = useState(false);
  const [refetchInterval,  setRefetchInterval]  = useState('2000');
  const [saved,            setSaved]            = useState(false);

  // PVE Nodes
  const [pveNodes,      setPveNodes]      = useState<PVENode[]>(loadNodes);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nodeName,      setNodeName]      = useState('');
  const [nodeHost,      setNodeHost]      = useState('');
  const [nodePort,      setNodePort]      = useState('8006');
  const [nodeUsername,  setNodeUsername]  = useState('');
  const [nodePassword,  setNodePassword]  = useState('');

  // Datastores
  const [datastores,       setDatastores]       = useState<Datastore[]>(loadDatastores);
  const [dsModalOpen,      setDsModalOpen]      = useState(false);
  const [dsName,           setDsName]           = useState('');
  const [dsPath,           setDsPath]           = useState('');
  const [dsType,           setDsType]           = useState('dir');
  const [dsNode,           setDsNode]           = useState('');

  const openNodeModal  = () => setNodeModalOpen(true);
  const closeNodeModal = () => {
    setNodeModalOpen(false);
    setNodeName(''); setNodeHost(''); setNodePort('8006'); setNodeUsername(''); setNodePassword('');
  };

  const openDsModal  = () => { setDsNode(pveNodes[0]?.name ?? proxmoxHost); setDsModalOpen(true); };
  const closeDsModal = () => {
    setDsModalOpen(false);
    setDsName(''); setDsPath(''); setDsType('dir'); setDsNode('');
  };

  const handleAddNode = () => {
    if (!nodeName.trim() || !nodeHost.trim()) {
      addAlert('Node name and host are required.', 'error');
      return;
    }
    const updated = [...pveNodes, { name: nodeName.trim(), host: nodeHost.trim(), port: nodePort.trim() || '8006', username: nodeUsername.trim() }];
    setPveNodes(updated);
    saveNodes(updated);
    addAlert(`Node "${nodeName.trim()}" added.`, 'success');
    closeNodeModal();
  };

  const handleRemoveNode = (name: string) => {
    const updated = pveNodes.filter(n => n.name !== name);
    setPveNodes(updated);
    saveNodes(updated);
    addAlert(`Node "${name}" removed.`, 'info');
  };

  const handleAddDatastore = () => {
    if (!dsName.trim() || !dsPath.trim()) {
      addAlert('Datastore name and path are required.', 'error');
      return;
    }
    const ds: Datastore = {
      id: `ds-${Date.now()}`,
      name: dsName.trim(),
      path: dsPath.trim(),
      type: dsType,
      node: dsNode || proxmoxHost,
    };
    const updated = [...datastores, ds];
    setDatastores(updated);
    saveDatastores(updated);
    addAlert(`Datastore "${ds.name}" added.`, 'success');
    closeDsModal();
  };

  const handleRemoveDatastore = (id: string) => {
    const ds = datastores.find(d => d.id === id);
    const updated = datastores.filter(d => d.id !== id);
    setDatastores(updated);
    saveDatastores(updated);
    if (ds) addAlert(`Datastore "${ds.name}" removed.`, 'info');
  };

  const handleSave = () => {
    localStorage.setItem('proxmox_host', proxmoxHost);
    localStorage.setItem('proxmox_port', proxmoxPort);
    addAlert('Settings saved to local storage. Restart the app to apply.', 'info');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleExportSettings = () => {
    const payload = {
      proxmox_host:           localStorage.getItem('proxmox_host') ?? proxmoxHost,
      proxmox_port:           localStorage.getItem('proxmox_port') ?? proxmoxPort,
      'local-pve-nodes':      pveNodes,
      'local-pve-datastores': datastores,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'local-pve-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // All node options (local + extra) for datastore node dropdown
  const allNodeOptions = [
    { id: proxmoxHost, label: `${proxmoxHost} (local)` },
    ...pveNodes.map(n => ({ id: n.name, label: `${n.name} — ${n.host}` })),
  ];

  return (
    <div className="animate-fade-in-up max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">Application and connection configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSettings}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} /> Export Settings
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                       text-white rounded-lg text-sm font-semibold transition-colors
                       shadow-sm shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
          >
            {saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-4">

        {/* Left column */}
        <div>
          {/* Proxmox connection */}
          <Section title="Proxmox Connection" icon={Server}>
            <Field label="Proxmox Host" description="Hostname or IP address of the Proxmox server">
              <input
                type="text"
                value={proxmoxHost}
                onChange={e => setProxmoxHost(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-48
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </Field>
            <Field label="Proxmox Port" description="API port (default: 8006)">
              <input
                type="text"
                value={proxmoxPort}
                onChange={e => setProxmoxPort(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-28
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              />
            </Field>
            <Field label="Verify SSL Certificate" description="Disable for self-signed certificates">
              <button
                onClick={() => setVerifySSL(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${verifySSL ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                                  ${verifySSL ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </Field>
          </Section>

          {/* Database */}
          <Section title="Database" icon={Database}>
            <Field
              label="Tables"
              description="Managed automatically by SQLAlchemy on startup"
            >
              <div className="flex flex-wrap gap-1.5">
                {['app_users', 'audit_log', 'vm_metadata', 'user_sessions', 'disk_metadata'].map(t => (
                  <span key={t} className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                    {t}
                  </span>
                ))}
              </div>
            </Field>
          </Section>
        </div>

        {/* Right column */}
        <div>
          {/* Dashboard */}
          <Section title="Dashboard" icon={RefreshCw}>
            <Field label="VM Refresh Interval" description="How often to poll Proxmox for VM status (milliseconds)">
              <select
                value={refetchInterval}
                onChange={e => setRefetchInterval(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              >
                <option value="1000">1 second</option>
                <option value="2000">2 seconds</option>
                <option value="5000">5 seconds</option>
                <option value="10000">10 seconds</option>
              </select>
            </Field>
          </Section>

          {/* Infrastructure */}
          <Section title="Infrastructure" icon={Network}>
            {/* PVE Nodes */}
            <Field label="PVE Nodes" description="Proxmox VE nodes managed by this application">
              <button
                onClick={openNodeModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus size={13} /> Add Node
              </button>
            </Field>
            <div className="mt-3 space-y-2 mb-4">
              {/* Local node — non-removable */}
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{proxmoxHost}</p>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wide">local</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{proxmoxHost}:{proxmoxPort}</p>
                </div>
              </div>
              {/* Additional nodes */}
              {pveNodes.map(n => (
                <div key={n.name} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{n.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{n.host}:{n.port}{n.username && ` · ${n.username}`}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveNode(n.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove node"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Datastores */}
            <Field label="Datastores" description="Storage locations managed by this application">
              <button
                onClick={openDsModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus size={13} /> Add Datastore
              </button>
            </Field>
            <div className="mt-3 space-y-2">
              {datastores.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">No datastores configured</p>
              ) : (
                datastores.map(ds => (
                  <div key={ds.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{ds.name}</p>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wide">{ds.type}</span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">{ds.path} · {ds.node}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveDatastore(ds.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove datastore"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* About */}
          <Section title="About" icon={ShieldAlert}>
            <Field label="Version">
              <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                v1.0.0
              </span>
            </Field>
          </Section>
        </div>
      </div>

      {/* Add Node Modal */}
      {nodeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <Network size={13} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Add PVE Node</h2>
              </div>
              <button onClick={closeNodeModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { label: 'Node Name',  value: nodeName,     setter: setNodeName,     placeholder: 'e.g. pve-node-1',    type: 'text' },
                { label: 'Host / IP',  value: nodeHost,     setter: setNodeHost,     placeholder: 'e.g. 192.168.1.10',  type: 'text' },
                { label: 'Port',       value: nodePort,     setter: setNodePort,     placeholder: '8006',                type: 'text' },
                { label: 'Username',   value: nodeUsername, setter: setNodeUsername, placeholder: 'e.g. root@pam',       type: 'text' },
                { label: 'Password',   value: nodePassword, setter: setNodePassword, placeholder: '••••••••',             type: 'password' },
              ].map(({ label, value, setter, placeholder, type }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddNode(); }}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={closeNodeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddNode}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  Add Node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Datastore Modal */}
      {dsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                  <Database size={13} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Add Datastore</h2>
              </div>
              <button onClick={closeDsModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                <input type="text" value={dsName} onChange={e => setDsName(e.target.value)}
                  placeholder="e.g. local-zfs"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Path</label>
                <input type="text" value={dsPath} onChange={e => setDsPath(e.target.value)}
                  placeholder="e.g. /var/lib/vz or tank/data"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</label>
                <select value={dsType} onChange={e => setDsType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors">
                  {DS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Node</label>
                <select value={dsNode} onChange={e => setDsNode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors">
                  {allNodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={closeDsModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddDatastore}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  Add Datastore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
