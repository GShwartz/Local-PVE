import { useState } from 'react';
import { createPortal } from 'react-dom';

interface DiskClonePopoverProps {
  vmName: string;
  vmDisks: string[];
  onConfirm: (diskKey: string, targetStorage: string, savePath: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DiskClonePopover = ({ vmName, vmDisks, onConfirm, onCancel, isLoading }: DiskClonePopoverProps) => {
  const [diskKey,       setDiskKey]       = useState(() => vmDisks[0] ?? 'scsi0');
  const [targetStorage, setTargetStorage] = useState('local');
  const [savePath,      setSavePath]      = useState('/var/lib/vz/images/');

  const canConfirm = diskKey.trim() && targetStorage.trim() && savePath.trim();

  const fieldCls = `w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-gray-50 text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500`;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[9998]"
        onClick={onCancel}
      />

      {/* Modal centered on screen */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]
                   bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 w-80 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <span className="text-sm font-semibold text-gray-700">
            Disk Only Clone — <span className="text-blue-600">{vmName}</span>
          </span>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Disk selector */}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
            Disk
          </label>
          <select
            value={diskKey}
            onChange={e => setDiskKey(e.target.value)}
            className={fieldCls}
          >
            {vmDisks.length > 0
            ? vmDisks.map(d => <option key={d} value={d}>{d}</option>)
            : <option value="">No disks found</option>
          }
          </select>
        </div>

        {/* Target storage */}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
            Target Storage
          </label>
          <input
            type="text"
            value={targetStorage}
            onChange={e => setTargetStorage(e.target.value)}
            placeholder="e.g. local"
            className={fieldCls}
          />
        </div>

        {/* Save path */}
        <div>
          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
            Save Path <span className="font-normal normal-case text-gray-400">(Linux path on PVE host)</span>
          </label>
          <input
            type="text"
            value={savePath}
            onChange={e => setSavePath(e.target.value)}
            placeholder="/var/lib/vz/images/"
            className={`${fieldCls} font-mono`}
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Path format: Linux (forward slashes). Windows/macOS clients use the server path.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={canConfirm && !isLoading
              ? () => onConfirm(diskKey.trim(), targetStorage.trim(), savePath.trim())
              : undefined}
            disabled={!canConfirm || isLoading}
            className="flex-1 text-white bg-purple-600 hover:bg-purple-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {isLoading ? 'Cloning…' : 'Clone Disk'}
          </button>
          <button
            onClick={onCancel}
            className="text-white bg-red-500 hover:bg-red-400 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default DiskClonePopover;
