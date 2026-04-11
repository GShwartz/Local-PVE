import { useState } from 'react';
import { Network, X } from 'lucide-react';

interface PVENode { name: string; host: string; port: string; username: string; }

interface AddNodeModalProps {
  onClose: () => void;
  onAdd: (node: PVENode) => void;
  addAlert: (message: string, type: string) => void;
}

const AddNodeModal = ({ onClose, onAdd, addAlert }: AddNodeModalProps) => {
  const [nodeName,     setNodeName]     = useState('');
  const [nodeHost,     setNodeHost]     = useState('');
  const [nodePort,     setNodePort]     = useState('8006');
  const [nodeUsername, setNodeUsername] = useState('');
  const [nodePassword, setNodePassword] = useState('');

  const handleAddNode = () => {
    if (!nodeName.trim() || !nodeHost.trim()) {
      addAlert('Node name and host are required.', 'error');
      return;
    }
    onAdd({ name: nodeName.trim(), host: nodeHost.trim(), port: nodePort.trim() || '8006', username: nodeUsername.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Network size={13} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Add PVE Node</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label: 'Node Name',  value: nodeName,     setter: setNodeName,     placeholder: 'e.g. pve-node-1',    type: 'text' },
            { label: 'Host / IP',  value: nodeHost,     setter: setNodeHost,     placeholder: 'e.g. 192.168.1.10',  type: 'text' },
            { label: 'Port',       value: nodePort,     setter: setNodePort,     placeholder: '8006',                type: 'text' },
            { label: 'Username',   value: nodeUsername, setter: setNodeUsername, placeholder: 'e.g. root@pam',       type: 'text' },
            { label: 'Password',   value: nodePassword, setter: setNodePassword, placeholder: '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022', type: 'password' },
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
            <button onClick={onClose}
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
  );
};

export default AddNodeModal;
