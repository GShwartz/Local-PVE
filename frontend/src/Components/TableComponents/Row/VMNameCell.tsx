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
  const cellRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    // Reset oldVMName when VM data changes (e.g., after successful apply)
    setEditVMName(vm.name);
    setOldVMName(null);
    setChangesToApply((prev) => ({ ...prev, vmname: null }));
  }, [vm.name, setChangesToApply]);

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
            disabled={editingVmid !== null && editingVmid !== vm.vmid || isApplying}
          />
          <button
            type="submit"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            style={{ height: '32px', lineHeight: '1.5' }}
            disabled={editingVmid !== null && editingVmid !== vm.vmid || isApplying}
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
            className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            style={{ height: '32px', lineHeight: '1.5' }}
            disabled={editingVmid !== null && editingVmid !== vm.vmid || isApplying}
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
                if (!isApplying) {
                  setIsEditing(true);
                  openEditModal(vm);
                }
              }}
              disabled={editingVmid !== null && editingVmid !== vm.vmid || isApplying}
              className={`ml-2 text-gray-400 hover:text-white ${editingVmid !== null && editingVmid !== vm.vmid || isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    </td>
  );
};

export default VMNameCell;