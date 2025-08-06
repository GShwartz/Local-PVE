import { UseMutationResult } from '@tanstack/react-query';
import { VM, Snapshot } from '../../../../types';
import { useState } from 'react';
import styles from '../../../../CSS/Loader.module.css';
import buttonStyles from '../../../../CSS/ExpandedArea.module.css';

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
                className={`${buttonStyles.button} ${buttonStyles['button-disabled']}`}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`${buttonStyles.button} ${
                  action === 'revert' ? buttonStyles['button-purple'] : buttonStyles['button-red']
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
    <>
      {snapshotsLoading && <p className="sr-only">Loading snapshots...</p>}
      {snapshotsError && <p className="text-red-500">Error loading snapshots: {snapshotsError.message}</p>}

      <div className="w-full flex-1 min-h-[300px] p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
            Snapshots
          </h5>
          {(isCreatingSnapshot || isRevertingSnapshot) && (
            <div className={`${styles.loader}`} aria-label="Snapshot action in progress">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={styles.circle}>
                  <div className={styles.dot}></div>
                  <div className={styles.outline}></div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => openModal(vm.vmid)}
            disabled={isCreatingSnapshot || isRevertingSnapshot || isAddingDisk}
            className={`${buttonStyles.button} ${
              isCreatingSnapshot || isRevertingSnapshot || isAddingDisk
                ? buttonStyles['button-disabled']
                : buttonStyles['button-blue']
            }`}
          >
            Take Snapshot
          </button>
        </div>

        {snapshots && snapshots.length === 0 ? (
          <p>No snapshots available.</p>
        ) : (
          <div className="max-h-52 overflow-y-auto">
            <ul className="my-4 space-y-3">
              {snapshots?.map((snapshot) => (
                <li key={snapshot.name}>
                  <div className="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-700 hover:bg-gray-600 group hover:shadow dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                    <span className="flex-1 text-left whitespace-nowrap">
                      {snapshot.name}
                      {snapshot.snaptime && (
                        <span className="block text-sm font-normal text-gray-500 dark:text-gray-400">
                          Created: {new Date(snapshot.snaptime * 1000).toLocaleString()}
                        </span>
                      )}
                    </span>
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
                        className={`${buttonStyles.button} ${
                          isRevertingSnapshot ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`)
                            ? buttonStyles['button-disabled']
                            : buttonStyles['button-purple']
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
                        className={`${buttonStyles.button} ${
                          pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`) ||
                          isCreatingSnapshot ||
                          pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)
                            ? buttonStyles['button-disabled']
                            : buttonStyles['button-red']
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
    </>
  );
};

export default SnapshotsView;
