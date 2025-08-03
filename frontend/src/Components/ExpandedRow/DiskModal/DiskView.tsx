import { useState, Dispatch, SetStateAction } from 'react';
import { VM, Snapshot } from '../../../types';
import DiskModal from './DiskModal';
import DiskList from './DiskList';
import useDiskConfig from './useDiskConfig';
import Loader from './Loader';

interface DisksViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
  snapshots?: Snapshot[];
  isAddingDisk: boolean;
  setIsAddingDisk: Dispatch<SetStateAction<boolean>>;
}

const DisksView = ({
  vm,
  node,
  auth,
  addAlert,
  refreshVMs,
  snapshots,
  isAddingDisk,
  setIsAddingDisk
}: DisksViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDiskKey, setPendingDiskKey] = useState<string | null>(null);
  const [deletingDiskKey, setDeletingDiskKey] = useState<string | null>(null);
  const { config, refreshConfig } = useDiskConfig(vm.vmid, node, auth);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const hasSnapshots = (snapshots?.length ?? 0) > 0;

  return (
    <>
      <div className="w-full flex-1 min-h-[300px] p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-7 gap-5">
          <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white whitespace-nowrap">
            Disks
          </h5>
          <div className="flex-grow flex justify-center">
            {isAddingDisk && <Loader />}
          </div>
          <button
            onClick={openModal}
            disabled={isAddingDisk || deletingDiskKey !== null}
            className={`text-white font-medium rounded-lg text-sm px-3 py-1 text-center whitespace-nowrap ${
              isAddingDisk || deletingDiskKey
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
            }`}
          >
            {isAddingDisk
              ? 'Adding...'
              : deletingDiskKey !== null
              ? 'Removing...'
              : 'Add Disk'}
          </button>
        </div>

        <DiskList
          config={config}
          vm={vm}
          node={node}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          pendingDiskKey={pendingDiskKey}
          deletingDiskKey={deletingDiskKey}
          setPendingDiskKey={setPendingDiskKey}
          setDeletingDiskKey={setDeletingDiskKey}
          refreshConfig={refreshConfig}
          hasSnapshots={hasSnapshots}
        />

        <DiskModal
          vm={vm}
          isOpen={isModalOpen}
          onClose={closeModal}
          node={node}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          setIsAddingDisk={setIsAddingDisk}
          refreshConfig={refreshConfig}
        />
      </div>
    </>
  );
};

export default DisksView;
