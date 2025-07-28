import { VM } from '../../types';

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
    <thead className="table-header">
      <tr style={{ height: '48px' }}>
        {headers.map(({ key, label }) => (
          <th
            key={key}
            scope="col"
            className={`table-header-th px-6 py-4 ${key === 'cpus' || key === 'ram' || key === 'hdd_sizes' ? 'narrow-col' : ''}`}
            onClick={() => handleSort(key)}
            style={{ height: '48px', verticalAlign: 'middle' }}
          >
            {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </th>
        ))}
        <th scope="col" className="table-header-apply px-2 py-4 border-r border-gray-700" style={{ height: '48px', verticalAlign: 'middle' }}></th>
        <th scope="col" className="table-header-empty" style={{ height: '48px', verticalAlign: 'middle' }}></th>
        <th scope="col" className="table-header-action px-2 py-4" style={{ height: '48px', verticalAlign: 'middle' }}>Actions</th>
      </tr>
    </thead>
  );
};

export default TableHeader;