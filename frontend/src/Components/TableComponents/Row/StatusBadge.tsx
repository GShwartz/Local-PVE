const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
      status === 'running' ? 'bg-green-600' :
      status === 'suspended' ? 'bg-yellow-600' :
      'bg-red-600'
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
