import { VM } from '../../types';

interface DisksViewProps {
  vm: VM;
}

const DisksView = ({ vm }: DisksViewProps) => {
  console.log('DisksView received hdd_sizes:', vm.hdd_sizes);

  if (!vm.hdd_sizes || vm.hdd_sizes === 'N/A') {
    return (
      <div className="flex justify-center mt-4">
        <div className="w-full sm:w-[400px] md:w-[460px] min-h-[300px] h-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
          <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white mb-3">
            Disks
          </h5>
          <p className="text-sm text-gray-600 dark:text-gray-300">No disks found.</p>
        </div>
      </div>
    );
  }

  const sizes = vm.hdd_sizes.split(',').map((s) => s.trim());

  return (
    <div className="flex justify-center mt-4">
      <div className="w-full sm:w-[400px] md:w-[460px] min-h-[300px] h-full p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
        <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white mb-3">
          Disks
        </h5>
        <ul className="my-4 space-y-3">
          {sizes.map((size, index) => (
            <li key={index}>
              <div className="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-700 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                <span className="flex-1 text-left whitespace-nowrap">{`Disk ${index + 1}`}</span>
                <span>{size}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DisksView;
