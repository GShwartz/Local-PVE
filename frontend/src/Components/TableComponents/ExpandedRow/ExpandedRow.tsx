import { useState } from 'react';

import SnapshotsView from './SnapshotsComponents/SnapshotsView';
import DisksView from './DiskModal/DiskView';
import NetworkingView from './Networking/NetworkingView';
import { VM, Snapshot } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';
import styles from '../../../CSS/ExpandedArea.module.css';

// Color schemes for different rows
const colorSchemes = [
  { primary: 'blue', secondary: 'purple', bg: 'from-blue-500/40 via-purple-500/60 to-blue-500/40', connector: 'rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.8)', shadow: 'shadow-blue-500/10', border: 'border-b-blue-500/30' },
  { primary: 'green', secondary: 'teal', bg: 'from-green-500/40 via-teal-500/60 to-green-500/40', connector: 'rgba(34, 197, 94, 0.8), rgba(20, 184, 166, 0.8)', shadow: 'shadow-green-500/10', border: 'border-b-green-500/30' },
  { primary: 'orange', secondary: 'red', bg: 'from-orange-500/40 via-red-500/60 to-orange-500/40', connector: 'rgba(249, 115, 22, 0.8), rgba(239, 68, 68, 0.8)', shadow: 'shadow-orange-500/10', border: 'border-b-orange-500/30' },
  { primary: 'purple', secondary: 'pink', bg: 'from-purple-500/40 via-pink-500/60 to-purple-500/40', connector: 'rgba(147, 51, 234, 0.8), rgba(236, 72, 153, 0.8)', shadow: 'shadow-purple-500/10', border: 'border-b-purple-500/30' },
  { primary: 'cyan', secondary: 'blue', bg: 'from-cyan-500/40 via-blue-500/60 to-cyan-500/40', connector: 'rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8)', shadow: 'shadow-cyan-500/10', border: 'border-b-cyan-500/30' }
];

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

  // Get color scheme based on VM ID for consistent coloring
  const colorScheme = colorSchemes[vm.vmid % colorSchemes.length];

  return expandedRows.has(vm.vmid) ? (
    <tr className="relative">
      <td colSpan={11} className="px-2 py-2 align-top relative">
        {/* Top connector line */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colorScheme.bg}`}></div>
        <div className={styles.container} style={{
          '--connector-gradient': colorScheme.connector,
          '--shadow-color': colorScheme.primary === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                          colorScheme.primary === 'green' ? 'rgba(34, 197, 94, 0.3)' :
                          colorScheme.primary === 'orange' ? 'rgba(249, 115, 22, 0.3)' :
                          colorScheme.primary === 'purple' ? 'rgba(147, 51, 234, 0.3)' :
                          'rgba(6, 182, 212, 0.3)'
        } as React.CSSProperties}>
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
