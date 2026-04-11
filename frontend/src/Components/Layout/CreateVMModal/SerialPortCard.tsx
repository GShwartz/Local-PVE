import React from 'react';
import { Terminal, Shield } from 'lucide-react';

interface SerialPortCardProps {
  enabled: boolean;
  setEnabled: (val: boolean) => void;
}

const SerialPortCard = ({ enabled, setEnabled }: SerialPortCardProps) => {
  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2';

  return (
    <div className={cardCls}>
      <p className={cardTitle}><Terminal size={12}/> Console Configuration</p>
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className={`mt-1 p-2 rounded-lg ${enabled ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
            <Shield size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Serial Port (socket)</p>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
              Enables serial console access. Required for many <br/> 
              Cloud-Init distributions to show boot output.
            </p>
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => setEnabled(!enabled)} 
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {enabled && (
        <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-1">
          <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1.5">
            Note: This will add 'serial0' as a socket device to the VM.
          </p>
        </div>
      )}
    </div>
  );
};

export default SerialPortCard;
