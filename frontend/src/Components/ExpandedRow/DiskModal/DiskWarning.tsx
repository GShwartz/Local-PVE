const DiskWarning = () => (
  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
    <p className="text-sm text-yellow-800 dark:text-yellow-200">
      <strong>Note:</strong> The VM will be temporarily stopped to add the disk, then restarted if it was running.
    </p>
  </div>
);

export default DiskWarning;
