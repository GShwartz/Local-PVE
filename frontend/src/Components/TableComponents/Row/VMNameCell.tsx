import { useState, useEffect, useRef } from 'react';
import { VM } from '../../../types';

interface VMNameCellProps {
  vm: VM;
  editingVmid: number | null;
  openEditModal: (vm: VM) => void;
  cancelEdit: () => void;
  setChangesToApply: React.Dispatch<React.SetStateAction<{ vmname: string | null; cpu: number | null; ram: string | null }>>;
  isApplying: boolean;
}

const VMNameCell = ({ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }: VMNameCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editVMName, setEditVMName] = useState(vm.name);
  const [oldVMName, setOldVMName] = useState<string | null>(null);
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const cellRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editButtonDisabled = (editingVmid !== null && editingVmid !== vm.vmid) || isApplying;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditVMName(vm.name);
    setOldVMName(null);
    setChangesToApply((prev) => ({ ...prev, vmname: null }));
  }, [vm.name, setChangesToApply]);

  // ❗ If we enter/leave editing mode, make sure any pending tooltip timer is cleared
  // and the tooltip is hidden so it doesn't linger over the input.
  useEffect(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (isEditing) {
      setShowTooltip(false);
    }
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  const handleEditSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (editVMName !== vm.name) {
      setOldVMName(vm.name);
      setChangesToApply((prev) => ({ ...prev, vmname: editVMName }));
    } else {
      setOldVMName(null);
      setChangesToApply((prev) => ({ ...prev, vmname: null }));
    }
    setIsEditing(false);
    cancelEdit();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditVMName(vm.name);
    setOldVMName(null);
    setChangesToApply((prev) => ({ ...prev, vmname: null }));
    cancelEdit();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Do not show tooltip while editing or when button is disabled
    if (isEditing || editButtonDisabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 30,
      left: rect.left + rect.width / 2,
    });

    // Start a delayed tooltip
    hoverTimerRef.current = setTimeout(() => {
      setTooltipMessage('Edit VM name');
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
      className="px-6 py-4 text-center relative"
      ref={cellRef}
      style={{ height: '48px', verticalAlign: 'middle' }}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <form onSubmit={handleEditSubmit} onClick={(e) => e.stopPropagation()} className="flex items-center justify-center space-x-2 w-full">
          <input
            type="text"
            value={editVMName}
            ref={inputRef}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditVMName(e.target.value)}
            className="w-32 p-1 bg-gray-900 text-white rounded-md text-sm"
            placeholder="New VM Name"
            style={{ height: '32px', lineHeight: '1.5' }}
            disabled={editButtonDisabled}
          />
          <button
            type="submit"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: '32px', lineHeight: '1.5' }}
            disabled={editButtonDisabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelEdit();
            }}
            className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: '32px', lineHeight: '1.5' }}
            disabled={editButtonDisabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center" style={{ height: '48px' }}>
          <div className="flex items-center" style={{ height: '32px', lineHeight: '1.5' }}>
            {editVMName}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!editButtonDisabled) {
                  setIsEditing(true);
                  setShowTooltip(false); // ensure tooltip not visible
                  if (hoverTimerRef.current) {
                    clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = null;
                  }
                  openEditModal(vm);
                }
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              disabled={editButtonDisabled}
              className={`ml-2 text-gray-400 hover:text-white ${editButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          {oldVMName && (
            <span className="text-xs text-gray-400 mt-1">Old name: {oldVMName}</span>
          )}
        </div>
      )}

      {showTooltip && !isEditing && (
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

export default VMNameCell;
