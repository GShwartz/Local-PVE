import { useState, useRef, useEffect } from 'react';
import { FiCopy } from 'react-icons/fi';
import { ChevronDown, Monitor, HardDrive } from 'lucide-react';
import ClonePopover from './ClonePopover';
import DiskClonePopover from './DiskClonePopover';

interface CloneButtonProps {
  disabled: boolean;
  showCloningLabel: boolean;
  // VM clone
  isVMCloning: boolean;
  cloneName: string;
  existingNames: string[];
  onVMCloneToggle: () => void;
  onChange: (name: string) => void;
  onVMCloneConfirm: () => void;
  onVMCloneCancel: () => void;
  // Disk clone
  isDiskCloning: boolean;
  isDiskCloneLoading?: boolean;
  vmDisks: string[];
  onDiskCloneToggle: () => void;
  onDiskCloneConfirm: (diskKey: string, targetStorage: string, savePath: string) => void;
  onDiskCloneCancel: () => void;
  vmName: string;
}

const CloneButton = ({
  disabled,
  showCloningLabel,
  isVMCloning,
  cloneName,
  existingNames,
  onVMCloneToggle,
  onChange,
  onVMCloneConfirm,
  onVMCloneCancel,
  isDiskCloning,
  isDiskCloneLoading,
  vmDisks,
  onDiskCloneToggle,
  onDiskCloneConfirm,
  onDiskCloneCancel,
  vmName,
}: CloneButtonProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [dropdownOpen]);

  const baseBtn =
    'flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div ref={dropdownRef} className="relative inline-flex flex-col items-center">
      {/* Main split button */}
      <div className="flex rounded overflow-hidden border border-purple-500/40">
        {/* Left: label / status */}
        <button
          onClick={(e) => { e.stopPropagation(); setDropdownOpen(v => !v); }}
          disabled={disabled}
          className={`${baseBtn} bg-purple-600 hover:bg-purple-700 text-white rounded-none border-r border-purple-500/40 pr-2`}
        >
          <FiCopy size={12} />
          {showCloningLabel ? 'Cloning…' : 'Clone'}
        </button>
        {/* Right: chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); setDropdownOpen(v => !v); }}
          disabled={disabled}
          className={`${baseBtn} bg-purple-600 hover:bg-purple-700 text-white rounded-none px-1.5`}
        >
          <ChevronDown size={11} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown menu */}
      {dropdownOpen && !disabled && (
        <div
          className="absolute bottom-full mb-1.5 left-0 bg-white border border-gray-200 rounded-lg shadow-lg
                     z-50 py-1 min-w-[160px]"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setDropdownOpen(false); onVMCloneToggle(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50
                       hover:text-gray-900 transition-colors"
          >
            <Monitor size={13} className="text-purple-500 flex-shrink-0" />
            VM Clone
          </button>
          <button
            onClick={() => { setDropdownOpen(false); onDiskCloneToggle(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50
                       hover:text-gray-900 transition-colors"
          >
            <HardDrive size={13} className="text-blue-500 flex-shrink-0" />
            Disk Only Clone
          </button>
        </div>
      )}

      {/* VM Clone popover — self-positions via its own absolute styles */}
      {isVMCloning && (
        <ClonePopover
          cloneName={cloneName}
          existingNames={existingNames}
          onChange={onChange}
          onConfirm={onVMCloneConfirm}
          onCancel={onVMCloneCancel}
        />
      )}

      {/* Disk Only Clone popover — self-positions via its own absolute styles */}
      {isDiskCloning && (
        <DiskClonePopover
          vmName={vmName}
          vmDisks={vmDisks}
          onConfirm={onDiskCloneConfirm}
          onCancel={onDiskCloneCancel}
          isLoading={isDiskCloneLoading}
        />
      )}
    </div>
  );
};

export default CloneButton;
