import { useState } from 'react';
import { VM } from '../../types';
import DiskModal from './DiskModal';

interface DisksViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void; // ✅ Add this line
}

const DisksView = ({ vm, node, auth, addAlert, refreshVMs }: DisksViewProps) => {

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const sizes = (vm.hdd_sizes && vm.hdd_sizes !== 'N/A')
    ? vm.hdd_sizes.split(',').map((s) => s.trim())
    : [];

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

        {sizes.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">No disks found.</p>
        ) : (
          <ul className="my-4 space-y-3 max-h-64 overflow-y-auto">
            {sizes.map((size, index) => {
              const controllerMatch = size.match(/^([a-z]+)\d*=/);
              const controllerLabel = controllerMatch ? controllerMatch[1].toUpperCase() : 'Disk';
              const actualSize = size.split('=')[1] || size;

              return (
                <li key={index}>
                  <div className="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                    <span className="flex-1 text-left whitespace-nowrap">
                      {controllerLabel} 💾 {index + 1}
                    </span>
                    <span>{actualSize}</span>
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
