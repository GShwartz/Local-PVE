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

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const fetchConfig = async () => {
      console.log('🔄 Fetching config for VM', vm.vmid, 'on node', node);
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
        console.log('✅ VM Config Response:', response.data);
        setConfig(response.data.config);
      } catch (err) {
        console.error('❌ Failed to fetch VM config:', err);
        setConfig({});
      }
    };

    fetchConfig();
  }, [vm.vmid, node, auth]);

  console.log('🧩 vm.config:', config);

  const diskEntries = Object.entries(config || {}).filter(([key, value]) => {
    const isDiskKey = /^(scsi|sata|virtio|ide)\d+$/.test(key);
    const isDiskValue = typeof value === 'string' && !/media=cdrom/.test(value);
    console.log(`🔍 Key: ${key}, Value: ${value}, isDisk: ${isDiskKey && isDiskValue}`);
    return isDiskKey && isDiskValue;
  });

  console.log('📦 Parsed disk entries for VM', vm.vmid, ':', diskEntries);

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

              const sizeMatch = value.match(/size=(\d+[KMGTP]?)/);
              const size = sizeMatch ? sizeMatch[1] : 'unknown';

              const ssdMatch = value.match(/ssd=(\d)/);
              const ssd = ssdMatch ? `ssd=${ssdMatch[1]}` : 'ssd=0';

              return (
                <li key={index}>
                  <div className="flex flex-col p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-left whitespace-nowrap">
                        {controllerLabel} 💾 {index + 1}
                      </span>
                      <span>{size}</span>
                    </div>
                    <div className="mt-0.5 text-base font-medium text-gray-300 dark:text-gray-400 text-left">
                      {controller} • {ssd}
                    </div>
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
