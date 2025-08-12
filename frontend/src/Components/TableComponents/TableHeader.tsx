import { VM } from '../../types';

interface TableHeaderProps {
  sortConfig: { key: keyof VM; direction: 'asc' | 'desc' };
  handleSort: (key: keyof VM) => void;
}

const TableHeader = ({
  sortConfig,
  handleSort,
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
    <thead className="table-header">
      <tr className="h-12 text-xs sm:text-sm">
        <th className="px-2 py-3"></th>
        {headers.map(({ key, label }) => (
          <th
            key={key}
            scope="col"
            className={`table-header-th px-2 sm:px-6 py-3 ${
              key === 'cpus' || key === 'ram' || key === 'hdd_sizes' ? 'narrow-col' : ''
            } cursor-pointer`}
            onClick={() => handleSort(key)}
          >
            {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </th>
        ))}
        <th scope="col" className="px-2 py-3 border-gray-700">
          VM Config
        </th>
        <th scope="col" className="px-2 sm:px-6 py-3 narrow-col">State</th>
        <th scope="col" className="px-2 py-3">Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;