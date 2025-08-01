import SnapshotsView from '../SnapshotsComponents/SnapshotsView';
import DisksView from './DiskView';
import { VM, Snapshot } from '../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface ExpandedRowProps {
  vm: VM;
  snapshotView: Set<number>;
  expandedRows: Set<number>;
  openModal: (vmid: number, name: string) => void;
  snapshotMutation: UseMutationResult<string, any, any, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, any, unknown>;
  pendingActions: { [vmid: number]: string[] };
  snapshots?: Snapshot[];
  snapshotsLoading: boolean;
  snapshotsError: any;
}

const ExpandedRow = ({
  vm,
  snapshotView,
  expandedRows,
  openModal,
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
  snapshots,
  snapshotsLoading,
  snapshotsError,
}: ExpandedRowProps) =>
  expandedRows.has(vm.vmid) ? (
    <tr className="border-b border-gray-700 bg-gray-900">
      <td colSpan={11} className="px-6 py-4 align-top">
        <div className="flex flex-wrap gap-6 justify-center">
          <DisksView vm={vm} />
          {snapshotView.has(vm.vmid) && (
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
        </div>
      </td>
    </tr>
  ) : null;

export default ExpandedRow;
