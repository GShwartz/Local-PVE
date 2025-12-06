import { UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiPlus } from 'react-icons/fi';
import { VM, Snapshot, Auth } from '../../../../types';
import { useState, useEffect } from 'react';
import styles from '../../../../CSS/ExpandedArea.module.css';
import SnapshotModal from './SnapshotModal';
import axios from 'axios';

interface SnapshotsViewProps {
  vm: VM;
  snapshots?: Snapshot[];
  snapshotsLoading: boolean;
  snapshotsError: any;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  pendingActions: { [vmid: number]: string[] };
  isAddingDisk?: boolean;
  node: string;
  auth: Auth;
  addAlert: (message: string, type: string) => void;
}


const SnapshotsView = ({
  vm,
  snapshots,
  snapshotsLoading,
  snapshotsError,
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
  isAddingDisk,
  node,
  auth,
  addAlert,
}: SnapshotsViewProps) => {
  const queryClient = useQueryClient();

  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((action) =>
    action.startsWith('create-')
  );
  const isRevertingSnapshot = pendingActions[vm.vmid]?.some((action) =>
    action.startsWith('revert-')
  );
  const isDeletingAnySnapshot = pendingActions[vm.vmid]?.some((action) =>
    action.startsWith('delete-')
  );


  // Inline confirmation states
  const [pendingSnapshotRemoval, setPendingSnapshotRemoval] = useState<string | null>(null);
  const [pendingSnapshotRevert, setPendingSnapshotRevert] = useState<string | null>(null);

  // Clear pending states when mutations complete
  useEffect(() => {
    if (snapshotMutation.isSuccess || snapshotMutation.isError) {
      setPendingSnapshotRevert(null);
    }
  }, [snapshotMutation.isSuccess, snapshotMutation.isError]);

  useEffect(() => {
    if (deleteSnapshotMutation.isSuccess || deleteSnapshotMutation.isError) {
      setPendingSnapshotRemoval(null);
    }
  }, [deleteSnapshotMutation.isSuccess, deleteSnapshotMutation.isError]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setSnapshotName('');
  };

  // Validation function for snapshot names
  const isValidSnapshotName = (name: string): boolean => /^[a-zA-Z0-9_+.-]{2,40}$/.test(name);

  // Local mutation for creating snapshots
  const createSnapshotMutation = useMutation<string, any, { vmid: number; snapname: string }>({
    mutationFn: async ({ vmid, snapname }): Promise<string> => {
      const response = await axios.post(
        `http://localhost:8000/vm/${node}/qemu/${vmid}/snapshot`,
        { snapname, description: '' },
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
          },
        }
      );
      return response.data as string;
    },
    onSuccess: (_, { vmid, snapname }) => {
      addAlert(`Snapshot "${snapname}" created successfully for VM ${vmid}`, 'success');
      // Delay the query invalidation to sync with action buttons loader (which has 10s cooldown)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['snapshots', node, vmid] });
        queryClient.invalidateQueries({ queryKey: ['vms', node] });
      }, 10000);
      closeModal();
    },
    onError: (error: any, { snapname }) => {
      addAlert(`Failed to create snapshot "${snapname}": ${error.response?.data?.detail || error.message}`, 'error');
    },
  });


  // Get the header title based on modal state
  const getHeaderTitle = () => {
    if (isModalOpen) return 'Take Snapshot';
    return 'Snapshots';
  };

  return (
    <div className="w-full flex-1 min-h-[300px] max-h-[600px] overflow-y-auto p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      {snapshotsLoading && <p className="sr-only">Loading snapshots...</p>}
      {snapshotsError && <p className="text-red-500">Error loading snapshots: {snapshotsError.message}</p>}

      <div className={styles.cardHeader}>
        <div className="flex items-center gap-2 flex-1">
          <h5 className={styles.cardTitle}>{getHeaderTitle()}</h5>
        </div>
        <div className="flex items-center gap-2">
          {!isModalOpen && (
            <button
              onClick={openModal}
              disabled={isCreatingSnapshot || isRevertingSnapshot || isAddingDisk || isDeletingAnySnapshot}
              className={`${styles.button} ${isCreatingSnapshot || isRevertingSnapshot || isAddingDisk || isDeletingAnySnapshot
                ? styles['button-disabled']
                : styles['button-blue']
                }`}
            >
              <FiPlus className="inline-block mr-1" /> Take Snapshot
            </button>
          )}
          {isModalOpen && (
            <button
              onClick={closeModal}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-all duration-200 group"
              aria-label="Close snapshot form"
            >
              <svg className="w-4 h-4 group-hover:rotate-90 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Show modal when open */}
      {isModalOpen && (
        <SnapshotModal
          isOpen={isModalOpen}
          closeModal={closeModal}
          snapshotName={snapshotName}
          setSnapshotName={setSnapshotName}
          currentVmid={vm.vmid}
          createSnapshotMutation={createSnapshotMutation}
          isValidSnapshotName={isValidSnapshotName}
          addAlert={addAlert}
          node={node}
          auth={auth}
        />
      )}

      {/* Always show snapshot list */}
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
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-gray-200">{snapshot.name}</span>
                      {snapshot.snaptime && (
                        <span className="text-xs text-gray-400 mt-0.5">
                          {new Date(snapshot.snaptime * 1000).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {pendingSnapshotRemoval === snapshot.name || pendingSnapshotRevert === snapshot.name ? (
                      <div className="flex items-center space-x-2 ml-auto">
                        {(pendingSnapshotRemoval && deleteSnapshotMutation.isPending) ||
                         (pendingSnapshotRevert && snapshotMutation.isPending) ? (
                          <span className="text-xs text-gray-400">
                            {pendingSnapshotRemoval ? 'Removing...' : 'Reverting...'}
                          </span>
                        ) : (
                          <>
                            <span className="text-xs text-red-300">
                              {pendingSnapshotRemoval ? 'Confirm Snapshot Removal' : 'Confirm Revert'}
                            </span>
                            <button
                              onClick={() => {
                                if (pendingSnapshotRemoval) {
                                  deleteSnapshotMutation.mutate({ vmid: vm.vmid, snapname: snapshot.name });
                                } else if (pendingSnapshotRevert) {
                                  snapshotMutation.mutate({ vmid: vm.vmid, snapname: snapshot.name });
                                }
                              }}
                              className={`${styles['button-small']} ${styles['button-small-green']}`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => {
                                setPendingSnapshotRemoval(null);
                                setPendingSnapshotRevert(null);
                              }}
                              className={`${styles['button-small']} ${styles['button-small-red']}`}
                            >
                              No
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex space-x-2 items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingSnapshotRevert(snapshot.name);
                          }}
                          disabled={isRevertingSnapshot || isCreatingSnapshot || isDeletingAnySnapshot}
                          className={`${styles['button-small']} ${isRevertingSnapshot ||
                            isCreatingSnapshot ||
                            isDeletingAnySnapshot
                            ? styles['button-small-disabled']
                            : styles['button-small-purple']
                            }`}
                        >
                          Revert
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingSnapshotRemoval(snapshot.name);
                          }}
                          disabled={isDeletingAnySnapshot || isCreatingSnapshot || pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)}
                          className={`${styles['button-small']} ${isDeletingAnySnapshot ||
                            isCreatingSnapshot ||
                            pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)
                            ? styles['button-small-disabled']
                            : styles['button-small-red']
                            }`}
                        >
                          Remove
                        </button>
                      </div>
                    )}
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

    </div>
  );
};

export default SnapshotsView;