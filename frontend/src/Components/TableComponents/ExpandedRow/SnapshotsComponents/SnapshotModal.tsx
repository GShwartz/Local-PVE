import { UseMutationResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Snapshot } from '../../../../types';
import { useState, useEffect, useRef } from 'react';

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
  const [isNameTaken, setIsNameTaken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNameTaken) {
      const timer = setTimeout(() => {
        setIsNameTaken(false);
      }, 1000); // Reset after 1 second
      return () => clearTimeout(timer);
    }
  }, [isNameTaken]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
      setIsNameTaken(true);
      return;
    }
    console.log(`Submitting snapshot creation for VM ${currentVmid} with snapname: "${snapshotName}"`);
    createSnapshotMutation.mutate({ vmid: currentVmid, snapname: snapshotName });
  };

  if (!isOpen) return null;

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 max-h-96 overflow-y-auto">
      {/* Form content */}
      <div className="space-y-4 mb-4">
        {/* Snapshot Name */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Snapshot Name
            </label>
            <button
              onClick={closeModal}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-all duration-200 group"
              aria-label="Close"
            >
              <svg className="w-4 h-4 group-hover:rotate-90 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value.trim())}
              placeholder="Enter letters, numbers, _, -, ., + (no spaces)"
              className={`w-full px-3 py-2.5 bg-white dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 group-hover:border-gray-300 dark:group-hover:border-gray-500 ${
                isNameTaken
                  ? 'border-red-500 animate-flicker'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
          {snapshotsLoading && <p className="text-xs text-gray-500">Loading existing snapshots...</p>}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 justify-start pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={closeModal}
            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleTakeSnapshot}
            disabled={!snapshotName || !isValidSnapshotName(snapshotName) || createSnapshotMutation.isPending || snapshotsLoading}
            className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200"
          >
            {createSnapshotMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnapshotModal;