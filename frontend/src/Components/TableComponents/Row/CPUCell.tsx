import { useState, useEffect, useRef } from 'react';
import { VM } from '../../../types';

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
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

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

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isEditingCPU || isApplying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 30,
      left: rect.left + rect.width / 2,
    });
    hoverTimerRef.current = setTimeout(() => {
      setTooltipMessage('Edit CPU count');
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
      className="px-6 py-4 text-center narrow-col relative"
      ref={cpuCellRef}
      style={{ height: '48px', verticalAlign: 'middle', position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
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
            <>
              <span className="px-2 py-1">{editCPUs}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isApplying) {
                    setIsEditingCPU(true);
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
        {oldCPUs !== null && (
          <span className="text-xs text-gray-400">Old CPUs: {oldCPUs}</span>
        )}
      </div>

      {showTooltip && !isEditingCPU && (
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

export default CPUCell;
