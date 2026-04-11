import React from 'react';
import { Plus, Trash2, HardDrive } from 'lucide-react';

const CTRL_OPTIONS = ['VirtIO SCSI', 'VirtIO Block', 'SATA', 'IDE'];
const DISK_SIZE_OPTIONS = [5, 10, 15, 20, 30, 40, 50, 60, 80, 100];

interface StorageCardProps {
  diskController: string;
  setDiskController: (v: string) => void;
  diskSizeGb: number;
  setDiskSizeGb: (v: number) => void;
  extraDisks: { controller: string; sizeGb: number }[];
  setExtraDisks: React.Dispatch<React.SetStateAction<{ controller: string; sizeGb: number }[]>>;
}

const StorageCard = ({
  diskController,
  setDiskController,
  diskSizeGb,
  setDiskSizeGb,
  extraDisks,
  setExtraDisks
}: StorageCardProps) => {
  const ctrlSelect =
    'border border-gray-200 rounded-lg pl-2 pr-7 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full cursor-pointer appearance-none bg-[url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")] bg-[length:10px_10px] bg-[right_6px_center] bg-no-repeat';

  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300 h-full w-full flex flex-col';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2';

  const handleAddDisk = () => {
    setExtraDisks(prev => [...prev, { controller: 'VirtIO SCSI', sizeGb: 5 }]);
  };

  const handleRemoveDisk = (idx: number) => {
    setExtraDisks(prev => prev.filter((_, i) => i !== idx));
  };

  const gridLayout = "grid grid-cols-[150px_1fr_24px] gap-2 items-center w-full";

  return (
    <div className={cardCls}>
      <p className="text-xs font-bold text-rose-500 uppercase"> Storage Resources</p>

      <div 
        className="space-y-3 overflow-y-auto overflow-x-hidden pr-2 max-h-[160px] custom-scrollbar"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* Primary Disk */}
        <div className={gridLayout}>
          <select
            value={diskController}
            onChange={e => setDiskController(e.target.value)}
            className={ctrlSelect}
          >
            {CTRL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={diskSizeGb}
            onChange={e => setDiskSizeGb(parseInt(e.target.value))}
            className={ctrlSelect}
          >
            {DISK_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} GB</option>)}
          </select>
          <div className="w-6" /> 
        </div>

        {/* Dynamic Extra Disks */}
        {extraDisks.map((disk, idx) => (
          <div key={idx} className={`${gridLayout} animate-in fade-in slide-in-from-left-2`}>
            <select
              value={disk.controller}
              onChange={e => setExtraDisks(prev => prev.map((d, i) => i === idx ? { ...d, controller: e.target.value } : d))}
              className={ctrlSelect}
            >
              {CTRL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <select
              value={disk.sizeGb}
              onChange={e => setExtraDisks(prev => prev.map((d, i) => i === idx ? { ...d, sizeGb: parseInt(e.target.value) } : d))}
              className={ctrlSelect}
            >
              {DISK_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} GB</option>)}
            </select>

            <button
              type="button"
              onClick={() => handleRemoveDisk(idx)}
              className="text-gray-400 hover:text-red-500 transition-colors flex justify-center items-center"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddDisk}
        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors mt-auto pt-2"
      >
        <Plus size={14} strokeWidth={3} /> ADD STORAGE DISK
      </button>
    </div>
  );
};

export default StorageCard;
