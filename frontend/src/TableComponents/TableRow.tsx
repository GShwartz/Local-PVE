import { useQuery } from '@tanstack/react-query';
import { UseMutationResult } from '@tanstack/react-query';
import { VM, Auth, Snapshot } from '../types';
import SnapshotsView from '../Components/SnapshotsView';
import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: number | null;
  showSnapshots: (vmid: number) => void;
  openModal: (vmid: number, vmName: string) => void;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string; name?: string }, unknown>;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  auth: Auth;
  node: string;
  openEditModal: (vm: VM) => void;
  editingVmid: number | null;
  cancelEdit: () => void;
}

const getSnapshots = async ({ node, vmid, csrf, ticket }: { node: string; vmid: number; csrf: string; ticket: string }): Promise<Snapshot[]> => {
  const { data } = await axios.get<Snapshot[]>(
    `http://localhost:8000/vm/${node}/${vmid}/snapshots`,
    { params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const TableRow = ({
  vm,
  expandedRows,
  toggleRow,
  snapshotView,
  showSnapshots,
  openModal,
  pendingActions,
  vmMutation,
  snapshotMutation,
  deleteSnapshotMutation,
  auth,
  node,
  openEditModal,
  editingVmid,
  cancelEdit,
}: TableRowProps) => {
  const { data: snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots', node, vm.vmid, auth.csrf_token, auth.ticket],
    queryFn: () => getSnapshots({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: snapshotView === vm.vmid,
  });

  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((action) => action.startsWith('create-'));
  const [isStarting, setIsStarting] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVMName, setEditVMName] = useState(vm.name);
  const cellRef = useRef<HTMLTableCellElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isStarting && vm.status === 'running') {
      setIsStarting(false);
    }
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') {
      setIsHalting(false);
    }
  }, [vm.status, isHalting]);

  const handleEditSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    console.log(`Would update VM ${vm.name} to ${editVMName}`);
    setIsEditing(false);
    setEditVMName(editVMName);
    cancelEdit();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditVMName(vm.name);
    cancelEdit();
  };

  const handleToggleRow = () => {
    toggleRow(vm.vmid);
  };

  return (
    <>
      <tr
        className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700"
        style={{ height: '48px' }}
        onClick={() => toggleRow(vm.vmid)}
      >
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.vmid}</td>
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
                disabled={editingVmid !== null && editingVmid !== vm.vmid}
              />
              <button
                type="submit"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                style={{ height: '32px', lineHeight: '1.5' }}
                disabled={editingVmid !== null && editingVmid !== vm.vmid}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                style={{ height: '32px', lineHeight: '1.5' }}
                disabled={editingVmid !== null && editingVmid !== vm.vmid}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center" style={{ height: '32px', lineHeight: '1.5' }}>
              {vm.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  openEditModal(vm);
                }}
                disabled={editingVmid !== null && editingVmid !== vm.vmid}
                className={`ml-2 text-gray-400 hover:text-white ${editingVmid !== null && editingVmid !== vm.vmid ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
        </td>
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.ip_address}</td>
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.os}</td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.cpus}</td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.ram}</td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.hdd_sizes}</td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              vm.status === 'running' ? 'bg-green-600 text-white' :
              vm.status === 'suspended' ? 'bg-yellow-600 text-white' :
              'bg-red-600 text-white'
            }`}
            style={{ height: '32px', lineHeight: '1.5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {vm.status}
          </span>
        </td>
        <td className="px-2 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}></td>
        <td className="px-2 py-2 text-center flex space-x-2 justify-center" style={{ height: '48px', verticalAlign: 'middle' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStarting(true);
              vmMutation.mutate({ vmid: vm.vmid, action: 'start', name: vm.name }, {
                onError: () => setIsStarting(false),
              });
            }}
            disabled={vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
            style={{ height: '32px', lineHeight: '1.5' }}
          >
            Start
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHalting(true);
              vmMutation.mutate({ vmid: vm.vmid, action: 'stop', name: vm.name }, {
                onError: () => setIsHalting(false),
              });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            } text-white`}
            style={{ height: '32px', lineHeight: '1.5' }}
          >
            Stop
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHalting(true);
              vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown', name: vm.name }, {
                onError: () => setIsHalting(false),
              });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown') || pendingActions[vm.vmid]?.includes('stop') || isHalting || isCreatingSnapshot}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown') || pendingActions[vm.vmid]?.includes('stop') || isHalting || isCreatingSnapshot
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white`}
            style={{ height: '32px', lineHeight: '1.5' }}
          >
            Shutdown
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              vmMutation.mutate({ vmid: vm.vmid, action: 'reboot', name: vm.name });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot') || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot') || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white`}
            style={{ height: '32px', lineHeight: '1.5' }}
          >
            Reboot
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              showSnapshots(vm.vmid);
            }}
            disabled={pendingActions[vm.vmid]?.includes('snapshots')}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              pendingActions[vm.vmid]?.includes('snapshots')
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            } text-white`}
            style={{ height: '32px', lineHeight: '1.5' }}
          >
            Snapshots
          </button>
        </td>
        <td
          className="px-2 py-4 text-center cursor-pointer"
          style={{ height: '48px', verticalAlign: 'middle' }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleRow();
          }}
        >
          {expandedRows.has(vm.vmid) ? '▲' : '▼'}
        </td>
      </tr>
      {expandedRows.has(vm.vmid) && (
        <tr>
          <td colSpan={11} className="px-6 py-4 bg-gray-800 text-center">
            <div className="expanded-content">
              {snapshotView === vm.vmid ? (
                <SnapshotsView
                  vm={vm}
                  snapshots={snapshots}
                  snapshotsLoading={snapshotsLoading}
                  snapshotsError={snapshotsError}
                  openModal={(vmid) => openModal(vmid, vm.name)}
                  snapshotMutation={snapshotMutation}
                  deleteSnapshotMutation={deleteSnapshotMutation}
                  pendingActions={pendingActions}
                />
              ) : (
                <>
                  Expanded details for {vm.name}:
                  <pre className="text-sm overflow-auto">{JSON.stringify(vm, null, 2)}</pre>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default TableRow;