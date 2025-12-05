import { UseMutationResult } from '@tanstack/react-query';
import { VM, Snapshot } from '../../../../types';
import { useState } from 'react';
import loaderStyles from '../../../../CSS/Loader.module.css';
import styles from '../../../../CSS/ExpandedArea.module.css';

interface SnapshotsViewProps {
  vm: VM;
  snapshots?: Snapshot[];
  snapshotsLoading: boolean;
  snapshotsError: any;
  openModal: (vmid: number) => void;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  pendingActions: { [vmid: number]: string[] };
  isAddingDisk?: boolean;
}

interface PopconfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  action: 'revert' | 'delete' | null;
}

const Popconfirm: React.FC<PopconfirmProps> = ({ isOpen, onConfirm, onCancel, message, action }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 mt-1 flex justify-center items-center bg-black/50">
      <div className="relative p-4 w-full max-w-sm max-h-full">
        <div className="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
          <div className="p-4 md:p-5">
            <p className="text-sm text-gray-900 dark:text-white mb-4">{message}</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={onCancel}
                className={`${styles.button} ${styles['button-disabled']}`}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`${styles.button} ${action === 'revert' ? styles['button-purple'] : styles['button-red']
                  }`}
              >
                {action === 'revert' ? 'Revert' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SnapshotsView = ({
  vm,
  snapshots,
  snapshotsLoading,
  snapshotsError,
  openModal,
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
  isAddingDisk,
}: SnapshotsViewProps) => {
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((action) =>
    action.startsWith('create-')
  );
  const isRevertingSnapshot = pendingActions[vm.vmid]?.some((action) =>
    action.startsWith('revert-')
  );

  const [popconfirm, setPopconfirm] = useState<{
    isOpen: boolean;
    action: 'revert' | 'delete' | null;
    snapname: string | null;
  }>({ isOpen: false, action: null, snapname: null });

  const showPopconfirm = (action: 'revert' | 'delete', snapname: string) => {
    setPopconfirm({ isOpen: true, action, snapname });
  };

  const handleConfirm = () => {
    if (popconfirm.action === 'revert' && popconfirm.snapname) {
      snapshotMutation.mutate({ vmid: vm.vmid, snapname: popconfirm.snapname });
    } else if (popconfirm.action === 'delete' && popconfirm.snapname) {
      deleteSnapshotMutation.mutate({ vmid: vm.vmid, snapname: popconfirm.snapname });
    }
    setPopconfirm({ isOpen: false, action: null, snapname: null });
  };

  const handleCancel = () => {
    setPopconfirm({ isOpen: false, action: null, snapname: null });
  };

  return (
    <div className="w-full flex-1 min-h-[300px] max-h-[600px] overflow-y-auto p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      {snapshotsLoading && <p className="sr-only">Loading snapshots...</p>}
      {snapshotsError && <p className="text-red-500">Error loading snapshots: {snapshotsError.message}</p>}

      <div className={styles.cardHeader}>
        <div className="flex items-center gap-2">
          <h5 className={styles.cardTitle}>Snapshots</h5>
          {(isCreatingSnapshot || isRevertingSnapshot) && (
            <div className={loaderStyles.loader} aria-label="Snapshot action in progress">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={loaderStyles.circle}>
                  <div className={loaderStyles.dot}></div>
                  <div className={loaderStyles.outline}></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => openModal(vm.vmid)}
          disabled={isCreatingSnapshot || isRevertingSnapshot || isAddingDisk}
          className={`${styles.button} ${isCreatingSnapshot || isRevertingSnapshot || isAddingDisk
            ? styles['button-disabled']
            : styles['button-blue']
            }`}
        >
          <span className="text-lg">+</span> Take Snapshot
        </button>
      </div>

      {snapshots && snapshots.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-gray-500 text-sm italic border border-dashed border-white/10 rounded-lg">
          No snapshots available
        </div>
      ) : (
        <div className={styles.column}>
          <div className={styles.listContainer}>
            <ul className="space-y-2">
              {snapshots?.map((snapshot) => (
                <li key={snapshot.name} className={styles.listItem}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-gray-200">{snapshot.name}</span>
                      {snapshot.snaptime && (
                        <span className="text-xs text-gray-400 mt-0.5">
                          {new Date(snapshot.snaptime * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showPopconfirm('revert', snapshot.name);
                        }}
                        disabled={
                          isRevertingSnapshot ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`)
                        }
                        className={`${styles.button} ${isRevertingSnapshot ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`)
                          ? styles['button-disabled']
                          : styles['button-purple']
                          }`}
                      >
                        Revert
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showPopconfirm('delete', snapshot.name);
                        }}
                        disabled={
                          pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`) ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)
                        }
                        className={`${styles.button} ${pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`) ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)
                          ? styles['button-disabled']
                          : styles['button-red']
                          }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {snapshot.description && (
                    <span className="text-xs text-gray-500 line-clamp-2 mt-2 border-t border-white/5 pt-2">
                      {snapshot.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Popconfirm
        isOpen={popconfirm.isOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={
          popconfirm.action === 'revert'
            ? `Are you sure you want to revert to snapshot "${popconfirm.snapname}"? This action cannot be undone.`
            : `Are you sure you want to delete snapshot "${popconfirm.snapname}"? This action cannot be undone.`
        }
        action={popconfirm.action}
      />
    </div>
  );
};

export default SnapshotsView;
