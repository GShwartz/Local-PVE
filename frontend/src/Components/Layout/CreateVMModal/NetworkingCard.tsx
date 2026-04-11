import React from 'react';
import { Plus, Trash2, Globe } from 'lucide-react';

const NIC_MODELS = ['virtio', 'e1000', 'e1000e', 'rtl8139', 'vmxnet3'];
const BRIDGE_OPTIONS = ['vmbr0', 'vmbr1', 'vmbr2'];

interface NetworkingCardProps {
  nics: { model: string; bridge: string }[];
  setNics: React.Dispatch<React.SetStateAction<{ model: string; bridge: string }[]>>;
}

const NetworkingCard = ({ nics, setNics }: NetworkingCardProps) => {
  const ctrlSelect =
    'border border-gray-200 rounded-lg pl-2 pr-7 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full appearance-none bg-[url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")] bg-[length:10px_10px] bg-[right_6px_center] bg-no-repeat';

  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300 h-full w-full flex flex-col';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2';

  const handleAddNic = () => {
    setNics(prev => [...prev, { model: 'virtio', bridge: BRIDGE_OPTIONS[0] }]);
  };

  const handleRemoveNic = (idx: number) => {
    if (nics.length <= 1) return;
    setNics(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className={cardCls}>
      <p className="text-xs font-bold text-rose-500 uppercase">Networking</p>

      <div 
        className="space-y-3 overflow-y-auto overflow-x-hidden pr-2 max-h-[160px] custom-scrollbar"
        style={{ scrollbarGutter: 'stable' }}
      >
        {nics.map((nic, idx) => (
          <div key={idx} className="grid grid-cols-[110px_1fr_24px] gap-2 items-center w-full animate-in fade-in slide-in-from-left-2">
            <select
              value={nic.model}
              onChange={e => setNics(prev => prev.map((n, i) => i === idx ? { ...n, model: e.target.value } : n))}
              className={ctrlSelect}
            >
              {NIC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={nic.bridge}
              onChange={e => setNics(prev => prev.map((n, i) => i === idx ? { ...n, bridge: e.target.value } : n))}
              className={ctrlSelect}
            >
              {BRIDGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <button
              type="button"
              onClick={() => handleRemoveNic(idx)}
              className="text-gray-400 hover:text-red-500 transition-colors flex justify-center items-center disabled:opacity-0"
              disabled={nics.length <= 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddNic}
        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors mt-auto pt-2"
      >
        <Plus size={14} strokeWidth={3} /> ADD NETWORK INTERFACE
      </button>
    </div>
  );
};

export default NetworkingCard;
