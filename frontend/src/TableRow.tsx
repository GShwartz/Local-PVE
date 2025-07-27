import { useQuery } from '@tanstack/react-query';
import { UseMutationResult } from '@tanstack/react-query';
import { VM, Auth, Snapshot } from './types';
import SnapshotsView from './SnapshotsView';
import axios from 'axios';
import { useState, useEffect } from 'react';

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: number | null;
  showSnapshots: (vmid: number) => void;
  openModal: (vmid: number) => void;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string }, unknown>;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  auth: Auth;
  node: string;
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
}: TableRowProps) => {
  const { data: snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots', node, vm.vmid, auth.csrf_token, auth.ticket],
    queryFn: () => getSnapshots({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: snapshotView === vm.vmid,
  });

  // Check if any action is pending for the VM
  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;

  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (isStarting && vm.status === 'running') {
      setIsStarting(false);
    }
  }, [vm.status, isStarting]);

  return (
    <>
      <tr
        className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
        onClick={() => toggleRow(vm.vmid)}
      >
        <td className="px-6 py-4 text-center">{vm.vmid}</td>
        <td className="px-6 py-4 text-center">{vm.name}</td>
        <td className="px-6 py-4 text-center">{vm.ip_address}</td>
        <td className="px-6 py-4 text-center">{vm.os}</td>
        <td className="px-6 py-4 text-center narrow-col">{vm.cpus}</td>
        <td className="px-6 py-4 text-center narrow-col">{vm.ram}</td>
        <td className="px-6 py-4 text-center narrow-col">{vm.hdd_sizes}</td>
        <td className="px-6 py-4 text-center narrow-col">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              vm.status === 'running' ? 'bg-green-600 text-white' :
              vm.status === 'suspended' ? 'bg-yellow-600 text-white' :
              'bg-red-600 text-white'
            }`}
          >
            {vm.status}
          </span>
        </td>
        <td className="px-2 py-4 text-center">
          {expandedRows.has(vm.vmid) ? '▼' : ''}
        </td>
        <td className="px-2 py-2 text-center flex space-x-2 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStarting(true);
              vmMutation.mutate({ vmid: vm.vmid, action: 'start' }, {
                onError: () => setIsStarting(false),
              });
            }}
            disabled={vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            Start
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              vmMutation.mutate({ vmid: vm.vmid, action: 'stop' });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop')}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop')
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            } text-white`}
          >
            Stop
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown' });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown')}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown')
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white`}
          >
            Shutdown
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              vmMutation.mutate({ vmid: vm.vmid, action: 'reboot' });
            }}
            disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot')}
            className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
              vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot')
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white`}
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
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            Snapshots
          </button>
        </td>
      </tr>
      {expandedRows.has(vm.vmid) && (
        <tr>
          <td colSpan={10} className="px-6 py-4 bg-gray-800 text-center">
            <div className="expanded-content">
              {snapshotView === vm.vmid ? (
                <SnapshotsView
                  vm={vm}
                  snapshots={snapshots}
                  snapshotsLoading={snapshotsLoading}
                  snapshotsError={snapshotsError}
                  openModal={openModal}
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