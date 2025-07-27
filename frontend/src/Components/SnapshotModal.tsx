import { UseMutationResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Snapshot } from '../types';

interface SnapshotModalProps {
  isOpen: boolean;
  closeModal: () => void;
  snapshotName: string;
  setSnapshotName: (name: string) => void;
  currentVmid: number | null;
  createSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string }, unknown>;
  isValidSnapshotName: (name: string) => boolean;
  addAlert: (message: string, type: string) => void;
  node: string;
  auth: { csrf_token: string; ticket: string };
}

const getSnapshots = async ({ node, vmid, csrf, ticket }: { node: string; vmid: number; csrf: string; ticket: string }): Promise<Snapshot[]> => {
  const { data } = await axios.get<Snapshot[]>(
    `http://localhost:8000/vm/${node}/${vmid}/snapshots`,
    { params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const SnapshotModal = ({
  isOpen,
  closeModal,
  snapshotName,
  setSnapshotName,
  currentVmid,
  createSnapshotMutation,
  isValidSnapshotName,
  addAlert,
  node,
  auth,
}: SnapshotModalProps) => {
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['snapshots', node, currentVmid, auth.csrf_token, auth.ticket],
    queryFn: () => getSnapshots({ node, vmid: currentVmid!, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: !!currentVmid && isOpen,
  });

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (!snapshotName) {
      addAlert('Snapshot name is required.', 'error');
      return;
    }
    if (snapshotName === 'current') {
      addAlert('Snapshot name "current" is reserved.', 'error');
      return;
    }
    if (!isValidSnapshotName(snapshotName)) {
      addAlert('Invalid snapshot name. Use letters, numbers, underscores, hyphens, dots, or plus signs (max 40 characters, no spaces).', 'error');
      return;
    }
    if (!currentVmid) {
      addAlert('VM ID is missing.', 'error');
      return;
    }
    if (snapshots && snapshots.some((snap) => snap.name === snapshotName)) {
      addAlert(`Snapshot name '${snapshotName}' already exists. Choose a different name.`, 'error');
      return;
    }
    console.log(`Submitting snapshot creation for VM ${currentVmid} with snapname: "${snapshotName}"`);
    createSnapshotMutation.mutate({ vmid: currentVmid, snapname: snapshotName });
  };

  return (
    <div
      id="take-snapshot-modal"
      tabIndex={-1}
      aria-hidden="true"
      className="fixed inset-0 z-50 flex justify-center items-center w-full h-[calc(100%-1rem)] max-h-full bg-black/50"
    >
      <div className="relative p-4 w-full max-w-md max-h-full">
        <div className="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
          <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Snapshot
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
              onClick={closeModal}
            >
              <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          <div className="p-4 md:p-5">
            <div className="space-y-4">
              {snapshotsLoading && <p>Loading existing snapshots...</p>}
              <div>
                <label htmlFor="snapshot-name" className="block mb-2 text-sm font-semibold text-gray-700 dark:text-white">Snapshot Name</label>
                <input
                  type="text"
                  name="snapshot-name"
                  id="snapshot-name"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-600 dark:text-white"
                  placeholder="Enter letters, numbers, _, -, ., + (no spaces)"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value.trim())}
                />
              </div>
              <button
                type="button"
                className="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold px-4 py-2 text-center dark:bg-blue-500 dark:hover:bg-blue-600"
                onClick={handleTakeSnapshot}
                disabled={!snapshotName || !isValidSnapshotName(snapshotName) || createSnapshotMutation.isPending || snapshotsLoading}
              >
                Take Snapshot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnapshotModal;