import { useState } from 'react';
import { VM, Snapshot } from '../../../../types';
import DiskModal from '../DiskModal/DiskModal';
import DiskList from '../DiskModal/DiskList';
import useDiskConfig from '../DiskModal/useDiskConfig';
import Loader from '../DiskModal/Loader';
import styles from '../../../../CSS/ExpandedArea.module.css';

interface DisksViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
  snapshots?: Snapshot[];
  hasSnapshots: boolean;
  setIsAddingDisk: (adding: boolean) => void;
  isAddingDisk: boolean;
}

const DisksView = ({
  vm,
  node,
  auth,
  addAlert,
  refreshVMs,
  snapshots,
  setIsAddingDisk,
  isAddingDisk,
}: DisksViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDiskKey, setPendingDiskKey] = useState<string | null>(null);
  const [deletingDiskKey, setDeletingDiskKey] = useState<string | null>(null);
  const { config, refreshConfig } = useDiskConfig(vm.vmid, node, auth);

  const hasSnapshots = (snapshots?.length ?? 0) > 0;

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Get the header title based on modal state and adding status
  const getHeaderTitle = () => {
    if (isAddingDisk) return 'Adding disk';
    return isModalOpen ? 'Add Disk' : 'Disks';
  };

  return (
    <div className="w-full flex-1 min-h-[300px] max-h-[600px] overflow-y-auto p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      <div className={styles.cardHeader}>
        <h5 className={styles.cardTitle}>{getHeaderTitle()}</h5>
        <div className="flex-grow flex justify-center">
          {isAddingDisk && <Loader />}
        </div>
        {isModalOpen ? (
          <button
            onClick={closeModal}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200 group"
            aria-label="Close"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 group-hover:scale-110 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            onClick={openModal}
            disabled={isAddingDisk || deletingDiskKey !== null}
            className={`${styles.button} ${isAddingDisk || deletingDiskKey
                ? styles['button-disabled']
                : styles['button-blue']
              }`}
          >
            <span className="text-lg">+</span> {isAddingDisk
              ? 'Adding...'
              : deletingDiskKey !== null
                ? 'Removing...'
                : 'Add Disk'}
          </button>
        )}
      </div>

      {isModalOpen ? (
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
      ) : (
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
      )}
    </div >
  );
};

export default DisksView;
