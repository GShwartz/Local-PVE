// OsSourceCard.tsx
import React, { useRef } from 'react';
import { FileCode, Upload, Check } from 'lucide-react';
import OsDropdown from './OsDropdown';

interface OsSourceCardProps {
  isoMode: 'qcow2' | 'iso';
  setIsoMode: (mode: 'qcow2' | 'iso') => void;
  osVersion: string;
  setOsVersion: (version: string) => void;
  isoFile: File | null;
  setIsoFile: (file: File | null) => void;
  addAlert: (message: string, type: string) => void;
}

const fieldBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border-gray-200 shadow-sm';

const OsSourceCard = ({
  isoMode,
  setIsoMode,
  osVersion,
  setOsVersion,
  isoFile,
  setIsoFile,
  addAlert
}: OsSourceCardProps) => {
  const isoFileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pt-2">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-3 ml-1">Operating System Source</label>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          type="button"
          onClick={() => setIsoMode('qcow2')}
          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isoMode === 'qcow2' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'}`}
        >
          <div className={`p-2 rounded-lg ${isoMode === 'qcow2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
            <FileCode size={18} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isoMode === 'qcow2' ? 'text-blue-900' : 'text-gray-700'}`}>Cloud Image</p>
            <p className="text-[10px] text-gray-500 font-medium">Fast-boot qcow2</p>
          </div>
          {isoMode === 'qcow2' && <Check size={16} className="ml-auto text-blue-600" />}
        </button>

        <button
          type="button"
          onClick={() => setIsoMode('iso')}
          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${isoMode === 'iso' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/5' : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'}`}
        >
          <div className={`p-2 rounded-lg ${isoMode === 'iso' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
            <Upload size={18} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isoMode === 'iso' ? 'text-blue-900' : 'text-gray-700'}`}>ISO File</p>
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
          <button
            type="button"
            onClick={() => isoFileRef.current?.click()}
            className={`${fieldBase} border-dashed border-2 py-2 flex flex-col items-center justify-center gap-1 group hover:bg-blue-50/50 hover:border-blue-300`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Upload size={20} className="text-gray-400 group-hover:text-blue-600" />
            </div>
            <span className={isoFile ? 'text-sm font-bold text-gray-900' : 'text-sm font-medium text-gray-400'}>
              {isoFile ? isoFile.name : 'Select or drop .iso image'}
            </span>
          </button>
          <input
            ref={isoFileRef}
            type="file"
            accept=".iso"
            className="hidden"
            onChange={(e) => setIsoFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}
    </div>
  );
};

export default OsSourceCard;
