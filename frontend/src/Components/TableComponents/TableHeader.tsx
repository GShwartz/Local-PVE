import { VM } from '../../types';

interface TableHeaderProps {
  sortConfig: { key: keyof VM; direction: 'asc' | 'desc' };
  handleSort: (key: keyof VM) => void;
  isApplying: boolean;
}

const TableHeader = ({ sortConfig, handleSort, isApplying }: TableHeaderProps) => {
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
    <>
      <style>
        {`
          .header-loader {
            display: inline-block;
            position: relative;
            width: 35px;
            height: 5px;
            background-image: 
              linear-gradient(#4B5563 5px, transparent 0), 
              linear-gradient(#4B5563 5px, transparent 0), 
              linear-gradient(#4B5563 5px, transparent 0), 
              linear-gradient(#4B5563 5px, transparent 0);
            background-repeat: no-repeat;
            background-size: 5px auto;
            background-position: 0 0, 10px 0, 20px 0, 30px 0;
            animation: pgfill 1s linear infinite;
          }
          .dark .header-loader {
            background-image: 
              linear-gradient(#D1D5DB 5px, transparent 0), 
              linear-gradient(#D1D5DB 5px, transparent 0), 
              linear-gradient(#D1D5DB 5px, transparent 0), 
              linear-gradient(#D1D5DB 5px, transparent 0);
          }
          @keyframes pgfill {
            0% {
              background-image: 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0);
            }
            25% {
              background-image: 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0);
            }
            50% {
              background-image: 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0);
            }
            75% {
              background-image: 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0);
            }
            100% {
              background-image: 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#4B5563 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0);
            }
          }
          .dark .header-loader {
            animation: pgfill-dark 1s linear infinite;
          }
          @keyframes pgfill-dark {
            0% {
              background-image: 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0);
            }
            25% {
              background-image: 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0);
            }
            50% {
              background-image: 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0);
            }
            75% {
              background-image: 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0);
            }
            100% {
              background-image: 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#D1D5DB 5px, transparent 0), 
                linear-gradient(#FF3D00 5px, transparent 0);
            }
          }
        `}
      </style>
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
          <th scope="col" className="table-header-apply px-2 py-4 border-r border-gray-700" style={{ height: '48px', verticalAlign: 'middle' }}>
            {isApplying ? (
              <div className="header-loader"></div>
            ) : (
              ''
            )}
          </th>
          <th scope="col" className="table-header-th px-6 py-4 narrow-col border-r border-gray-700" style={{ height: '48px', verticalAlign: 'middle' }}>
            Status
          </th>
          <th scope="col" className="table-header-action px-2 py-4" style={{ height: '48px', verticalAlign: 'middle' }}>Actions</th>
        </tr>
      </thead>
    </>
  );
};

export default TableHeader;
