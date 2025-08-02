import { useState, useEffect } from 'react';
import axios from 'axios';
import { VM } from '../../types';
import DiskModal from '../DiskModal/DiskModal';

interface DisksViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
}

interface VMConfigResponse {
  config: VM['config'];
}

const DisksView = ({ vm, node, auth, addAlert, refreshVMs }: DisksViewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState<VM['config'] | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [pendingDiskKey, setPendingDiskKey] = useState<string | null>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setRefreshCounter((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get<VMConfigResponse>(
          `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/config`,
          {
            params: {
              csrf_token: auth.csrf_token,
              ticket: auth.ticket,
            },
          }
        );
        setConfig(response.data.config);
      } catch (err) {
        console.error('❌ Failed to fetch VM config:', err);
        setConfig({});
      }
    };

    fetchConfig();
  }, [vm.vmid, node, auth, refreshCounter]);

  const diskEntries = Object.entries(config || {})
    .filter(([key, value]) => {
      const isDiskKey = /^(scsi|sata|virtio|ide)\d+$/.test(key);
      const isDiskValue = typeof value === 'string' && !/media=cdrom/.test(value);
      return isDiskKey && isDiskValue;
    })
    .sort(([keyA], [keyB]) => {
      const matchA = keyA.match(/^([a-z]+)(\d+)$/);
      const matchB = keyB.match(/^([a-z]+)(\d+)$/);
      if (!matchA || !matchB) return 0;
      const [_, ctrlA, numA] = matchA;
      const [__, ctrlB, numB] = matchB;
      if (ctrlA !== ctrlB) return ctrlA.localeCompare(ctrlB);
      return parseInt(numA) - parseInt(numB);
    });

  const confirmRemoveDisk = async (diskKey: string) => {
    try {
      if (vm.status === 'running') {
        addAlert(
          `VM ${vm.vmid} is currently running. Sending shutdown request before removing disk ${diskKey}...`,
          'info'
        );

        await axios.post(
          `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/shutdown`,
          {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
          }
        );

        addAlert(`Shutdown initiated for VM ${vm.vmid} on node ${node}.`, 'info');

        await new Promise((res) => setTimeout(res, 3000));
      }

      await axios.request({
        method: 'DELETE',
        url: `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}`,
        params: {
          csrf_token: auth.csrf_token,
          ticket: auth.ticket,
        },
        headers: { 'Content-Type': 'application/json' },
      });

      addAlert(
        `✅ Disk ${diskKey} was successfully removed from VM ${vm.vmid} on node ${node}.`,
        'success'
      );

      setPendingDiskKey(null);
      setRefreshCounter((prev) => prev + 1);
    } catch (err: any) {
      console.error('❌ Failed to remove disk:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      addAlert(
        `❌ Failed to remove disk ${diskKey} from VM ${vm.vmid} on node ${node}: ${detail}`,
        'error'
      );
    }
  };

  const handleClickRemove = (diskKey: string) => {
    if (diskEntries.length === 1) {
      addAlert(
        `⚠️ Cannot remove ${diskKey} — it is the only disk attached to VM ${vm.vmid}.`,
        'warning'
      );
      return;
    }

    setPendingDiskKey(diskKey);
  };

  const handleCancelRemove = () => {
    setPendingDiskKey(null);
  };

  return (
    <div className="flex justify-center mt-4">
      <div className="w-full sm:w-[400px] md:w-[460px] min-h-[300px] h-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
            Disks
          </h5>
          <button
            onClick={openModal}
            className="text-white font-medium rounded-lg text-sm px-3 py-1 text-center bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Add Disk
          </button>
        </div>

        {!config ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading disks...</p>
        ) : diskEntries.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">No disks found.</p>
        ) : (
          <ul className="my-4 space-y-3 max-h-64 overflow-y-auto">
            {diskEntries.map(([key, value], index) => {
              const controller = key.replace(/\d+$/, '') || 'unknown';
              const controllerLabel = controller.toUpperCase();
              const controllerNumber = key.match(/\d+$/)?.[0];
              const sizeMatch = value.match(/size=(\d+[KMGTP]?)/);
              const size = sizeMatch ? sizeMatch[1] : 'unknown';
              const isPending = pendingDiskKey === key;

              return (
                <li key={index}>
                  <div className="flex items-center justify-between p-3 text-sm font-medium text-gray-900 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                    <div className="flex items-center space-x-4">
                      <span className="text-[16px] font-semibold">
                        {controllerLabel} 💾 {controllerNumber}
                      </span>
                      <span className="text-sm font-normal text-gray-200">{size}</span>
                    </div>
                    {isPending ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-red-300">
                          {vm.status === 'running'
                            ? 'Shutdown + Remove?'
                            : 'Confirm remove?'}
                        </span>
                        <button
                          onClick={() => confirmRemoveDisk(key)}
                          className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleCancelRemove}
                          className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClickRemove(key)}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DiskModal
          vm={vm}
          isOpen={isModalOpen}
          onClose={closeModal}
          node={node}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
        />
      </div>
    </div>
  );
};

export default DisksView;
