import { VM } from './types';

interface TableHeaderProps {
  sortConfig: { key: keyof VM; direction: 'asc' | 'desc' };
  handleSort: (key: keyof VM) => void;
}

const TableHeader = ({ sortConfig, handleSort }: TableHeaderProps) => {
  const headers: { key: keyof VM; label: string }[] = [
    { key: 'vmid', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'os', label: 'OS' },
    { key: 'cpus', label: 'CPU (Cores)' },
    { key: 'ram', label: 'RAM (MB)' },
    { key: 'hdd_sizes', label: 'HDD Sizes' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <thead className="text-xs uppercase bg-gray-800 text-gray-400">
      <tr>
        {headers.map(({ key, label }) => (
          <th
            key={key}
            scope="col"
            className={`px-6 py-3 cursor-pointer text-center ${key === 'cpus' || key === 'ram' || key === 'hdd_sizes' || key === 'status' ? 'narrow-col' : ''}`}
            onClick={() => handleSort(key)}
          >
            {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </th>
        ))}
        <th scope="col" className="px-2 py-3 w-8"></th>
        <th scope="col" className="px-6 py-3 text-center">Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;