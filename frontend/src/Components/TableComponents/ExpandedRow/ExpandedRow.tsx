import { useState } from 'react';

import SnapshotsView from './SnapshotsComponents/SnapshotsView';
import DisksView from './DiskModal/DiskView';
import NetworkingView from './Networking/NetworkingView';
import { VM, Snapshot } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';
import styles from '../../../CSS/ExpandedArea.module.css';


interface ExpandedRowProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  snapshotView: Set<number>;
  expandedRows: Set<number>;
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
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
  snapshots,
  snapshotsLoading,
  snapshotsError,
  refreshVMs,
}: ExpandedRowProps) => {
  const hasSnapshots = (snapshots?.length ?? 0) > 0;
  const [isAddingDisk, setIsAddingDisk] = useState(false);

  return expandedRows.has(vm.vmid) ? (
    <tr className="relative">
      <td colSpan={12} className="px-2 py-2 align-top relative" style={{ background: '#edf2f7' }}>
        <div className={styles.container}>
          {/* Disks card */}
          <div className={styles.column}>
            <DisksView
              vm={vm}
              node={node}
              auth={auth}
              addAlert={addAlert}
              refreshVMs={refreshVMs}
              snapshots={snapshots}
              hasSnapshots={hasSnapshots}
              setIsAddingDisk={setIsAddingDisk}
              isAddingDisk={isAddingDisk}
            />
          </div>

          {/* Networking card */}
          <div className={styles.column}>
            <NetworkingView
              vm={vm}
              node={node}
              auth={auth}
              addAlert={addAlert}
              refreshVMs={refreshVMs}
            />
          </div>

          {/* Snapshots card */}
          {snapshotView.has(vm.vmid) && (
            <div className={styles.column}>
              <SnapshotsView
                vm={vm}
                snapshots={snapshots}
                snapshotsLoading={snapshotsLoading}
                snapshotsError={snapshotsError}
                snapshotMutation={snapshotMutation}
                deleteSnapshotMutation={deleteSnapshotMutation}
                pendingActions={pendingActions}
                isAddingDisk={isAddingDisk}
                node={node}
                auth={auth}
                addAlert={addAlert}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  ) : null;
};

export default ExpandedRow;
