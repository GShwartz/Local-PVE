import { useState } from 'react';
import { Layers } from 'lucide-react';

interface CreateK8sModalProps {
  isOpen: boolean;
  closeModal: () => void;
  node: string;
  addAlert: (message: string, type: string) => void;
}

const CNI_OPTIONS = ['Flannel', 'Calico', 'Cilium'];

const CreateK8sModal = ({ isOpen, closeModal, node, addAlert }: CreateK8sModalProps) => {
  const [clusterName,   setClusterName]   = useState('');
  const [selectedNode,  setSelectedNode]  = useState(node);
  const [masters,       setMasters]       = useState(1);
  const [workers,       setWorkers]       = useState(2);
  const [cpuPerNode,    setCpuPerNode]    = useState(2);
  const [ramPerNode,    setRamPerNode]    = useState(2048);
  const [cni,           setCni]           = useState('Flannel');
  const [nameError,     setNameError]     = useState(false);

  // Build node list from localStorage + local node
  const extraNodes: { name: string; host: string }[] = (() => {
    try { const raw = localStorage.getItem('local-pve-nodes'); if (raw) return JSON.parse(raw); } catch { /**/ }
    return [];
  })();
  const localLabel = localStorage.getItem('proxmox_host') || node;
  const nodeOptions = [
    { id: node, label: `${localLabel} (local)` },
    ...extraNodes.map(n => ({ id: n.name, label: `${n.name} — ${n.host}` })),
  ];

  const isValidName = (name: string) => /^[a-zA-Z0-9_-]{1,40}$/.test(name);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setClusterName(v);
    setNameError(v !== '' && !isValidName(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clusterName || !isValidName(clusterName)) {
      setNameError(true);
      addAlert('Cluster name must be 1–40 characters: letters, numbers, hyphens, underscores.', 'error');
      return;
    }
    addAlert(
      `K8s cluster "${clusterName}" queued: ${masters} master${masters > 1 ? 's' : ''} + ${workers} worker${workers > 1 ? 's' : ''} on ${selectedNode} — full orchestration coming soon.`,
      'info',
    );
    closeModal();
  };

  if (!isOpen) return null;

  const fieldBase = 'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors';
  const fieldOk   = 'border-gray-300';
  const fieldErr  = 'border-red-300 focus:ring-red-400/30 focus:border-red-400';

  const BtnGroup = ({ options, value, onChange }: { options: number[]; value: number; onChange: (v: number) => void }) => (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 text-xs font-semibold transition-colors
            ${value === opt ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}
            ${i > 0 ? 'border-l border-gray-300' : ''}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Layers size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Create K8s Cluster</h2>
          </div>
          <button type="button" onClick={closeModal}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Cluster Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Cluster Name
            </label>
            <input
              type="text"
              value={clusterName}
              onChange={handleNameChange}
              className={`${fieldBase} ${nameError ? fieldErr : fieldOk}`}
              placeholder="e.g. k8s-prod"
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-500">Letters, numbers, hyphens and underscores only (max 40).</p>
            )}
          </div>

          {/* Target Node */}
          {nodeOptions.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Target Node
              </label>
              <select
                value={selectedNode}
                onChange={e => setSelectedNode(e.target.value)}
                className={`${fieldBase} ${fieldOk}`}
              >
                {nodeOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Master nodes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Master Nodes
            </label>
            <BtnGroup options={[1, 3, 5]} value={masters} onChange={setMasters} />
            <p className="mt-1 text-xs text-gray-400">Use 3 or 5 for HA control plane.</p>
          </div>

          {/* Worker nodes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Worker Nodes — {workers}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={workers}
              onChange={e => setWorkers(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* CPU + RAM per node */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                CPU / Node
              </label>
              <BtnGroup options={[1, 2, 4]} value={cpuPerNode} onChange={setCpuPerNode} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                RAM / Node
              </label>
              <select
                value={ramPerNode}
                onChange={e => setRamPerNode(parseInt(e.target.value))}
                className={`${fieldBase} ${fieldOk}`}
              >
                {[512, 1024, 2048, 4096, 8192].map(o => (
                  <option key={o} value={o}>{o >= 1024 ? `${o / 1024} GB` : `${o} MB`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CNI */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              CNI Plugin
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {CNI_OPTIONS.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCni(opt)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors
                    ${cni === opt ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}
                    ${i > 0 ? 'border-l border-gray-300' : ''}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2.5 text-xs text-gray-500 space-y-0.5">
            <p><span className="font-medium text-gray-700">Total VMs:</span> {masters + workers}</p>
            <p><span className="font-medium text-gray-700">Total vCPUs:</span> {(masters + workers) * cpuPerNode}</p>
            <p><span className="font-medium text-gray-700">Total RAM:</span> {((masters + workers) * ramPerNode / 1024).toFixed(1)} GB</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              Create Cluster
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateK8sModal;
