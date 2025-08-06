interface NetworkingHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

const NetworkingHeader = ({ loading, onRefresh }: NetworkingHeaderProps) => (
  <div className="flex items-center justify-between mb-4">
    <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
      Networking
    </h5>
    <button
      onClick={onRefresh}
      disabled={loading}
      className={`text-white font-medium rounded-lg text-sm px-3 py-1 text-center ${
        loading
          ? 'bg-gray-600 cursor-not-allowed'
          : 'bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
      }`}
    >
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  </div>
);

export default NetworkingHeader;
