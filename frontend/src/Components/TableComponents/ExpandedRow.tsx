import SnapshotsView from '../SnapshotsComponents/SnapshotsView';
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
    <tr className="border-b border-gray-700">
      <td colSpan={9} className="px-6 py-4 bg-gray-800 text-center border-r border-gray-700">
        <div className="expanded-content"></div>
      </td>
      <td className="px-2 pt-2 pb-2 text-center">
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
      </td>
      <td className="px-2 py-4 text-center"></td>
    </tr>
  ) : null;

export default ExpandedRow;
