import { useState, useEffect, useRef } from 'react';
import { VM } from '../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface CPUCellProps {
  vm: VM;
  editingVmid: number | null;
  openEditModal: (vm: VM) => void;
  cancelEdit: () => void;
  setChangesToApply: React.Dispatch<React.SetStateAction<{ vmname: string | null; cpu: number | null; ram: string | null }>>;
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string; name?: string; cpus?: number }, unknown>;
}

const CPUCell = ({ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, vmMutation }: CPUCellProps) => {
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

  const handleCPUChange = (value: number) => {
    setEditCPUs(value);
    if (validCPUs.includes(value) && value !== vm.cpus) {
      setOldCPUs(vm.cpus);
      setChangesToApply((prev) => ({ ...prev, cpu: value }));
      vmMutation.mutate({ vmid: vm.vmid, action: 'update_cpu', name: vm.name, cpus: value });
    } else {
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
      onClick={(e) => {
        e.stopPropagation();
        setIsEditingCPU(true);
        openEditModal(vm);
      }}
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
              >
                {validCPUs.map((cpu) => (
                  <option key={cpu} value={cpu}>
                    {cpu}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="cursor-pointer hover:bg-gray-900 hover:scale-110 transition-all duration-200 px-2 py-1 rounded">
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