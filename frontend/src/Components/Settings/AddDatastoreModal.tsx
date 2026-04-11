import { useState } from 'react';
import { Database, X } from 'lucide-react';

interface Datastore { id: string; name: string; path: string; type: string; node: string; }

const DS_TYPES = ['dir', 'nfs', 'lvm', 'zfs'];

interface AddDatastoreModalProps {
  onClose: () => void;
  onAdd: (ds: Datastore) => void;
  addAlert: (message: string, type: string) => void;
  nodeOptions: { id: string; label: string }[];
  defaultNode: string;
}

const AddDatastoreModal = ({ onClose, onAdd, addAlert, nodeOptions, defaultNode }: AddDatastoreModalProps) => {
  const [dsName, setDsName] = useState('');
  const [dsPath, setDsPath] = useState('');
  const [dsType, setDsType] = useState('dir');
  const [dsNode, setDsNode] = useState(defaultNode);

  const handleAddDatastore = () => {
    if (!dsName.trim() || !dsPath.trim()) {
      addAlert('Datastore name and path are required.', 'error');
      return;
    }
    onAdd({
      id: `ds-${Date.now()}`,
      name: dsName.trim(),
      path: dsPath.trim(),
      type: dsType,
      node: dsNode || defaultNode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Database size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Add Datastore</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
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
              {nodeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
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
  );
};

export default AddDatastoreModal;
