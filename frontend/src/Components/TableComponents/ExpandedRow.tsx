import SnapshotsView from '../SnapshotsComponents/SnapshotsView';
import DisksView from './DiskView';
import { VM, Snapshot } from '../../types';
import { UseMutationResult } from '@tanstack/react-query';
import styles from '../../CSS/ExpandedArea.module.css';

interface ExpandedRowProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  snapshotView: Set<number>;
  expandedRows: Set<number>;
  openModal: (vmid: number, name: string) => void;
  snapshotMutation: UseMutationResult<string, any, any, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, any, unknown>;
  pendingActions: { [vmid: number]: string[] };
  snapshots?: Snapshot[];
  snapshotsLoading: boolean;
  snapshotsError: any;
  refreshVMs: () => void;
}

const ExpandedRow = ({
  vm,
  node,
  auth,
  addAlert,
  snapshotView,
  expandedRows,
  openModal,
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
  snapshots,
  snapshotsLoading,
  snapshotsError,
  refreshVMs,
}: ExpandedRowProps) =>
  expandedRows.has(vm.vmid) ? (
    <tr className="border-b border-gray-700 bg-gray-900">
      <td colSpan={11} className="px-6 py-4 align-top">
        <div className={styles.container}>
          <div className={styles.column}>
            <DisksView
              vm={vm}
              node={node}
              auth={auth}
              addAlert={addAlert}
              refreshVMs={refreshVMs}
            />
          </div>
          {snapshotView.has(vm.vmid) && (
            <div className={styles.column}>
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
            </div>
          )}
        </div>
      </td>
    </tr>
  ) : null;

export default ExpandedRow;
