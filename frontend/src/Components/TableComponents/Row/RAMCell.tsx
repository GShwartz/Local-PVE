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
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isEditingRAM || isApplying) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 30,
      left: rect.left + rect.width / 2,
    });

    hoverTimerRef.current = setTimeout(() => {
      setTooltipMessage('Edit RAM size');
      setShowTooltip(true);
    }, 1000);
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
      className="px-6 py-4 text-center narrow-col"
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
                className="w-16 bg-gray-800 text-white border border-gray-600 rounded-md text-center"
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
                className={`ml-2 text-gray-400 hover:text-white ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>
        {oldRAM !== null && (
          <span className="text-xs text-gray-400">Old RAM: {oldRAM}</span>
        )}
      </div>

      {showTooltip && !isEditingRAM && (
        <div
          className="note-tooltip show absolute z-10 bg-black text-white text-xs rounded px-2 py-1"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltipMessage}
        </div>
      )}
    </td>
  );
};

export default RAMCell;
