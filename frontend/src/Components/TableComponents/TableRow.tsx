import { useQuery } from '@tanstack/react-query';
import { UseMutationResult } from '@tanstack/react-query';
import { VM, Auth, Snapshot } from '../../types';
import SnapshotsView from '../SnapshotsComponents/SnapshotsView';
import axios from 'axios';
import { useState } from 'react';
import VMNameCell from './VMNameCell';
import CPUCell from './CPUCell';
import ActionButtons from './ActionButtons';

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: number | null;
  showSnapshots: (vmid: number) => void;
  openModal: (vmid: number, vmName: string) => void;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string; name?: string; cpus?: number }, unknown>;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  auth: Auth;
  node: string;
  openEditModal: (vm: VM) => void;
  editingVmid: number | null;
  cancelEdit: () => void;
  hasRowAboveExpanded: boolean;
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
  hasRowAboveExpanded,
}: TableRowProps) => {
  const { data: snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots', node, vm.vmid, auth.csrf_token, auth.ticket],
    queryFn: () => getSnapshots({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: snapshotView === vm.vmid,
  });

  const [changesToApply, setChangesToApply] = useState<{ vmname: string | null; cpu: number | null; ram: string | null }>({
    vmname: null,
    cpu: null,
    ram: null,
  });

  const handleApplyChanges = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (changesToApply.vmname) {
      vmMutation.mutate({ vmid: vm.vmid, action: 'rename', name: changesToApply.vmname });
    }
    if (changesToApply.cpu !== null) {
      vmMutation.mutate({ vmid: vm.vmid, action: 'update_cpu', name: vm.name, cpus: changesToApply.cpu });
    }
    setChangesToApply({ vmname: null, cpu: null, ram: null });
  };

  const hasChanges = changesToApply.vmname !== null || changesToApply.cpu !== null || changesToApply.ram !== null;

  const hddList = vm.hdd_sizes.split(',').map(s => s.trim()).sort((a, b) => {
    const numA = parseInt(a.match(/disk-(\d+)/)?.[1] || '0', 10);
    const numB = parseInt(b.match(/disk-(\d+)/)?.[1] || '0', 10);
    return numA - numB;
  });

  return (
    <>
      <tr
        className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700"
        style={{ height: '48px', position: 'relative', zIndex: 10 }}
      >
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.vmid}</td>
        <VMNameCell
          vm={vm}
          editingVmid={editingVmid}
          openEditModal={openEditModal}
          cancelEdit={cancelEdit}
          setChangesToApply={setChangesToApply}
          vmMutation={vmMutation}
        />
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle', width: '160px' }}>{vm.ip_address}</td>
        <td className="px-6 py-4 text-center" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.os}</td>
        <CPUCell
          vm={vm}
          editingVmid={editingVmid}
          openEditModal={openEditModal}
          cancelEdit={cancelEdit}
          setChangesToApply={setChangesToApply}
          vmMutation={vmMutation}
        />
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>{vm.ram}</td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>
          {hddList.length > 1 ? (
            <div className="flex flex-col items-center">
              {hddList.map((disk, i) => (
                <span key={i}>{disk}</span>
              ))}
            </div>
          ) : (
            vm.hdd_sizes
          )}
        </td>
        <td className="px-6 py-4 text-center narrow-col" style={{ height: '48px', verticalAlign: 'middle' }}>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              vm.status === 'running' ? 'bg-green-600 text-white' :
              vm.status === 'suspended' ? 'bg-yellow-600 text-white' :
              'bg-red-600 text-white'
            }`}
            style={{ height: '24px', lineHeight: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {vm.status}
          </span>
        </td>
        <td className="px-2 py-2 text-center border-r border-gray-700" style={{ height: '48px', verticalAlign: 'middle' }}>
          <button
            onClick={handleApplyChanges}
            disabled={!hasChanges}
            className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              hasChanges ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-gray-600 cursor-not-allowed text-white'
            }`}
            style={{ height: '24px', lineHeight: '1' }}
          >
            Apply
          </button>
        </td>
        <td
          className={`px-2 py-2 text-center action-buttons-cell ${hasRowAboveExpanded ? 'border-t border-gray-700' : ''}`}
          style={{ height: '48px', verticalAlign: 'middle' }}
        >
          <ActionButtons
            vm={vm}
            pendingActions={pendingActions}
            vmMutation={vmMutation}
            showSnapshots={showSnapshots}
            onToggleRow={() => {}}
          />
        </td>
        <td
          className="px-2 py-4 text-center cursor-pointer"
          style={{ height: '48px', verticalAlign: 'middle' }}
          onClick={() => toggleRow(vm.vmid)}
        >
          {expandedRows.has(vm.vmid) && snapshotView !== vm.vmid ? '▲' : '▼'}
        </td>
      </tr>
      {expandedRows.has(vm.vmid) && (
        <tr className="border-b border-gray-700">
          <td colSpan={9} className="px-6 py-4 bg-gray-800 text-center border-r border-gray-700">
            <div className="expanded-content">
            </div>
          </td>
          <td className="px-2 py-2 text-center action-buttons-cell" style={{ height: '48px', verticalAlign: 'middle' }}>
            {snapshotView === vm.vmid && (
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
            )}
          </td>
          <td className="px-2 py-4 text-center border-b border-gray-700" style={{ height: '48px', verticalAlign: 'middle' }}></td>
        </tr>
      )}
    </>
  );
};

export default TableRow;