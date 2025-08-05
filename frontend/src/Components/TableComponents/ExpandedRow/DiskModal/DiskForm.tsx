interface DiskFormProps {
  size: number;
  setSize: (s: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  loading: boolean;
}

const DiskForm = ({
  size,
  setSize,
  handleSubmit,
  error,
  loading,
}: DiskFormProps) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-white">Size (GB)</label>
      <select
        value={size}
        onChange={e => setSize(+e.target.value)}
        className="mt-1 block w-full h-[38px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        {[2, 4, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80].map(v => (
          <option key={v} value={v}>{v} GB</option>
        ))}
      </select>
    </div>

    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

    <button
      type="submit"
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
    >
      {loading ? 'Adding Disk...' : 'Add Disk'}
    </button>
  </form>
);

export default DiskForm;
