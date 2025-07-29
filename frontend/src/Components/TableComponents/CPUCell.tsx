import { useState, useEffect, useRef } from 'react';
import { VM } from '../../types';

interface CPUCellProps {
  vm: VM;
  editingVmid: number | null;
  openEditModal: (vm: VM) => void;
  cancelEdit: () => void;
  setChangesToApply: React.Dispatch<React.SetStateAction<{ vmname: string | null; cpu: number | null; ram: string | null }>>;
  isApplying: boolean;
}

const CPUCell = ({ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }: CPUCellProps) => {
  const [isEditingCPU, setIsEditingCPU] = useState(false);
  const [editCPUs, setEditCPUs] = useState(vm.cpus);
  const [oldCPUs, setOldCPUs] = useState<number | null>(null);
  const cpuCellRef = useRef<HTMLTableCellElement>(null);
  const validCPUs = [1, 2, 4, 6];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cpuCellRef.current && !cpuCellRef.current.contains(e.target as Node)) {
        setEditCPUs(vm.cpus);
        setIsEditingCPU(false);
        setOldCPUs(null);
        setChangesToApply((prev) => ({ ...prev, cpu: null }));
        cancelEdit();
      }
    };

    if (isEditingCPU) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingCPU, vm.cpus, cancelEdit, setChangesToApply]);

  useEffect(() => {
    // Reset oldCPUs when VM data changes (e.g., after successful apply)
    setEditCPUs(vm.cpus);
    setOldCPUs(null);
    setChangesToApply((prev) => ({ ...prev, cpu: null }));
  }, [vm.cpus, setChangesToApply]);

  const handleCPUChange = (value: number) => {
    setEditCPUs(value);
    if (validCPUs.includes(value) && value !== vm.cpus) {
      setOldCPUs(vm.cpus);
      setChangesToApply((prev) => ({ ...prev, cpu: value }));
    } else {
      setOldCPUs(null);
      setChangesToApply((prev) => ({ ...prev, cpu: null }));
    }
    setIsEditingCPU(false);
    cancelEdit();
  };

  return (
    <td
      className="px-6 py-4 text-center narrow-col"
      ref={cpuCellRef}
      style={{ height: '48px', verticalAlign: 'middle', position: 'relative' }}
    >
      <div className="flex flex-col items-center justify-center space-y-1" style={{ height: '48px' }}>
        <div className="flex items-center justify-center" style={{ height: '32px', lineHeight: '1' }}>
          {isEditingCPU && editingVmid === vm.vmid ? (
            <div className="flex items-center space-x-2">
              <select
                value={editCPUs}
                onChange={(e) => handleCPUChange(Number(e.target.value))}
                className="w-16 bg-gray-800 text-white border border-gray-600 rounded-md text-center"
                autoFocus
                disabled={isApplying}
              >
                {validCPUs.map((cpu) => (
                  <option key={cpu} value={cpu}>
                    {cpu}
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
                  setIsEditingCPU(true);
                  openEditModal(vm);
                }
              }}
            >
              {editCPUs}
            </span>
          )}
        </div>
        {oldCPUs !== null && (
          <span className="text-xs text-gray-400">Old CPUs: {oldCPUs}</span>
        )}
      </div>
    </td>
  );
};

export default CPUCell;