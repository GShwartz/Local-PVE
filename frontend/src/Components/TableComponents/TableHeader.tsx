import { VM } from '../../types';

interface TableHeaderProps {
  sortConfig: { key: keyof VM; direction: 'asc' | 'desc' };
  handleSort: (key: keyof VM) => void;
  isSticky: boolean;
}

const TableHeader = ({
  sortConfig,
  handleSort,
  isSticky,
}: TableHeaderProps) => {
  const headers: { key: keyof VM; label: string }[] = [
    { key: 'vmid', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'os', label: 'OS' },
    { key: 'cpus', label: 'Cores' },
    { key: 'ram', label: 'RAM' },
    { key: 'hdd_sizes', label: 'HDD' },
  ];

  return (
    <thead className={`bg-gray-800/50 backdrop-blur-sm border-b border-white/10 ${isSticky ? 'sticky top-0 z-10' : ''}`}>
      <tr className="h-12 text-xs sm:text-sm">
        <th className="px-2 py-3 rounded-tl-lg"></th>
        {headers.map(({ key, label }) => (
          <th
            key={key}
            scope="col"
            className={`px-2 sm:px-6 py-3 font-semibold text-gray-300 uppercase tracking-wider text-xs ${key === 'cpus' || key === 'ram' || key === 'hdd_sizes' ? 'narrow-col' : ''
              } cursor-pointer hover:text-white transition-colors`}
            onClick={() => handleSort(key)}
          >
            <div className="flex items-center justify-center gap-1">
              {label}
              {sortConfig.key === key && (
                <span className="text-blue-400 font-bold">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
          </th>
        ))}
        <th scope="col" className="px-2 py-3 border-gray-700 font-semibold text-gray-300 uppercase tracking-wider text-xs">
          VM Config
        </th>
        <th scope="col" className="px-2 sm:px-6 py-3 narrow-col font-semibold text-gray-300 uppercase tracking-wider text-xs">State</th>
        <th scope="col" className="px-2 py-3 rounded-tr-lg font-semibold text-gray-300 uppercase tracking-wider text-xs">Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;