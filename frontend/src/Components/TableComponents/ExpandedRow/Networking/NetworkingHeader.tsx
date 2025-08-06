interface NetworkingHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onAddNIC: () => void;
}

const NetworkingHeader = ({ loading, onRefresh, onAddNIC }: NetworkingHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
        Networking
      </h5>

      <div className="flex gap-2">
        <button
          onClick={onAddNIC}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-400"
        >
          Add NIC
        </button>

        <button
          onClick={onRefresh}
          disabled={loading}
          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-white rounded-lg ${
            loading
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400'
          }`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default NetworkingHeader;
