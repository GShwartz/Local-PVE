import { useState, useEffect, useRef } from 'react';
import { VM } from '../../types';

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
    // Reset oldRAM when VM data changes (e.g., after successful apply)
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

  return (
    <td
      className="px-6 py-4 text-center narrow-col"
      ref={ramCellRef}
      style={{ height: '48px', verticalAlign: 'middle', position: 'relative' }}
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
            <span
              className={`px-2 py-1 rounded ${!isApplying ? 'cursor-pointer hover:bg-gray-900 hover:scale-110 transition-all duration-200' : 'cursor-not-allowed'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isApplying) {
                  setIsEditingRAM(true);
                  openEditModal(vm);
                }
              }}
            >
              {editRAM}
            </span>
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