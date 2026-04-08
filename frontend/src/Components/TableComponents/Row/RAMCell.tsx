import { useState, useEffect, useRef } from 'react';
import { VM } from '../../../types';

interface RAMCellProps {
  vm: VM;
  editingVmid: number | null;
  openEditModal: (vm: VM) => void;
  cancelEdit: () => void;
  setChangesToApply: React.Dispatch<React.SetStateAction<{ vmname: string | null; cpu: number | null; ram: string | null }>>;
  isApplying: boolean;
}

const RAMCell = ({ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }: RAMCellProps) => {
  const formatRAMToString = (ram: number): string => {
    if (ram >= 1024 && ram % 1024 === 0) {
      return `${ram / 1024}GB`;
    }
    return `${ram}MB`;
  };

  const [isEditingRAM, setIsEditingRAM] = useState(false);
  const [editRAM, setEditRAM] = useState(formatRAMToString(vm.ram));
  const [oldRAM, setOldRAM] = useState<string | null>(null);
  const ramCellRef = useRef<HTMLTableCellElement>(null);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const validRAMs = ['512MB', '1GB', '2GB', '4GB', '8GB'];

  const parseRAMToNumber = (ram: string): number => {
    if (ram.endsWith('GB')) {
      return parseInt(ram.replace('GB', '')) * 1024;
    }
    return parseInt(ram.replace('MB', ''));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ramCellRef.current && !ramCellRef.current.contains(e.target as Node)) {
        setEditRAM(formatRAMToString(vm.ram));
        setIsEditingRAM(false);
        setOldRAM(null);
        setChangesToApply((prev) => ({ ...prev, ram: null }));
        cancelEdit();
      }
    };

    if (isEditingRAM) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingRAM, vm.ram, cancelEdit, setChangesToApply]);

  useEffect(() => {
    setEditRAM(formatRAMToString(vm.ram));
    setOldRAM(null);
    setChangesToApply((prev) => ({ ...prev, ram: null }));
  }, [vm.ram, setChangesToApply]);

  const handleRAMChange = (value: string) => {
    setEditRAM(value);
    const ramNumber = parseRAMToNumber(value);
    if (validRAMs.includes(value) && ramNumber !== vm.ram) {
      setOldRAM(formatRAMToString(vm.ram));
      setChangesToApply((prev) => ({ ...prev, ram: value }));
    } else {
      setOldRAM(null);
      setChangesToApply((prev) => ({ ...prev, ram: null }));
    }
    setIsEditingRAM(false);
    cancelEdit();
  };

  const handleMouseEnter = () => {
    if (isEditingRAM || isApplying) return;
    hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setShowTooltip(false);
  };

  return (
    <td
      className="px-3 py-3 text-center narrow-col"
      ref={ramCellRef}
      style={{ height: '48px', verticalAlign: 'middle', position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center justify-center space-y-1" style={{ height: '48px' }}>
        <div className="flex items-center justify-center" style={{ height: '32px', lineHeight: '1' }}>
          {isEditingRAM && editingVmid === vm.vmid ? (
            <div className="flex items-center space-x-2">
              <select
                value={editRAM}
                onChange={(e) => handleRAMChange(e.target.value)}
                className="w-16 bg-white text-gray-800 border border-gray-300 rounded-md text-center"
                autoFocus
                disabled={isApplying}
              >
                {validRAMs.map((ram) => (
                  <option key={ram} value={ram}>
                    {ram}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <span className="px-2 py-1 rounded">{editRAM}</span>
              <span className="relative inline-flex items-center ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isApplying) {
                      setIsEditingRAM(true);
                      setShowTooltip(false);
                      if (hoverTimerRef.current) {
                        clearTimeout(hoverTimerRef.current);
                        hoverTimerRef.current = null;
                      }
                      openEditModal(vm);
                    }
                  }}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  disabled={isApplying}
                  className={`text-gray-400 hover:text-blue-500 ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {showTooltip && !isEditingRAM && (
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                               whitespace-nowrap rounded bg-white text-gray-700 text-xs font-medium
                               px-2 py-0.5 border border-gray-200 shadow-sm"
                    style={{ zIndex: 9999 }}
                  >
                    Edit RAM size
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        {oldRAM !== null && (
          <span className="text-xs text-gray-400">Old RAM: {oldRAM}</span>
        )}
      </div>

    </td>
  );
};

export default RAMCell;
