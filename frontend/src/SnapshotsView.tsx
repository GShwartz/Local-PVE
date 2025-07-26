// SnapshotsView.tsx
import { UseMutationResult } from '@tanstack/react-query';
import { VM, Snapshot } from './types';

interface SnapshotsViewProps {
  vm: VM;
  snapshots?: Snapshot[];
  snapshotsLoading: boolean;
  snapshotsError: any;
  openModal: (vmid: number) => void;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  pendingActions: { [vmid: number]: string[] };
}

const SnapshotsView = ({
  vm,
  snapshots,
  snapshotsLoading,
  snapshotsError,
  openModal,
  snapshotMutation,
  deleteSnapshotMutation,
  pendingActions,
}: SnapshotsViewProps) => {
  return (
    <>
      {snapshotsLoading && <p>Loading snapshots...</p>}
      {snapshotsError && <p className="text-red-500">Error loading snapshots: {snapshotsError.message}</p>}
      {snapshots && snapshots.length === 0 && (
        <div className="flex justify-center">
          <div className="w-full max-w-lg p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
                Snapshots
              </h5>
              <button
                onClick={() => openModal(vm.vmid)}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-1 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Take Snapshot
              </button>
            </div>
            <p>No snapshots available.</p>
          </div>
        </div>
      )}
      {snapshots && snapshots.length > 0 && (
        <div className="flex justify-center">
          <div className="w-full max-w-lg p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
                Snapshots
              </h5>
              <button
                onClick={() => openModal(vm.vmid)}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-1 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                Take Snapshot
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <ul className="my-4 space-y-3">
                {snapshots.map((snapshot) => (
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
                            snapshotMutation.mutate({ vmid: vm.vmid, snapname: snapshot.name });
                          }}
                          disabled={pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)}
                          className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
                            pendingActions[vm.vmid]?.includes(`revert-${snapshot.name}`)
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-700'
                          } text-white`}
                        >
                          Revert
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSnapshotMutation.mutate({ vmid: vm.vmid, snapname: snapshot.name });
                          }}
                          disabled={pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`)}
                          className={`px-3 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
                            pendingActions[vm.vmid]?.includes(`delete-${snapshot.name}`)
                              ? 'bg-gray-600 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700'
                          } text-white`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SnapshotsView;