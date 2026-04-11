import React from 'react';
import { Globe } from 'lucide-react';

interface InstanceIdentityCardProps {
  vmName: string;
  setVmName: (name: string) => void;
  selectedNode: string;
  setSelectedNode: (node: string) => void;
  nodeOptions: { id: string; label: string }[];
  nameError: boolean;
  setNameError: (error: boolean) => void;
  isValidName: (name: string) => boolean;
  instanceCount: number;
  setInstanceCount: (count: number) => void;
}

const fieldBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border-gray-200 shadow-sm';
const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300';
const cardTitle = 'text-xs font-bold text-rose-500 uppercase flex items-center gap-2';

const InstanceIdentityCard = ({
  vmName,
  setVmName,
  selectedNode,
  setSelectedNode,
  nodeOptions,
  nameError,
  setNameError,
  isValidName,
  instanceCount,
  setInstanceCount
}: InstanceIdentityCardProps) => {
  return (
    <div className={cardCls}>
      <p className={cardTitle}><Globe size={12} /> Instance Identity</p>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Hostname - 50% width on md */}
        <div className="md:col-span-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Base Hostname</label>
          <input
            type="text"
            value={vmName}
            autoFocus
            onChange={(e) => {
              setVmName(e.target.value);
              setNameError(!isValidName(e.target.value));
            }}
            className={`${fieldBase} ${nameError && vmName !== '' ? 'border-red-300 bg-red-50/30' : ''}`}
            placeholder="e.g. srv-prod"
          />
          {instanceCount > 1 && !nameError && vmName !== '' && (
            <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase tracking-tight ml-1 animate-in fade-in slide-in-from-left-1">
              Suffix: {vmName}-1 to {vmName}-{instanceCount}
            </p>
          )}
        </div>

        {/* Count - 25% width on md */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Qty</label>
          <input
            type="number"
            min="1"
            max="20"
            value={instanceCount}
            onChange={(e) => setInstanceCount(Math.max(1, parseInt(e.target.value) || 1))}
            className={fieldBase}
          />
        </div>

        {/* Node - 25% width on md */}
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Target Node</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className={fieldBase}
          >
            {nodeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default InstanceIdentityCard;
