import { useEffect, useState } from 'react';
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

  // Keep the loader visible for at least 5 seconds after apply is triggered
  const [showMinWindow, setShowMinWindow] = useState(false);

  useEffect(() => {
    if (!isApplying) return;

    setShowMinWindow(true);
    const t = setTimeout(() => setShowMinWindow(false), 5000);

    return () => clearTimeout(t);
  }, [isApplying]);

  const showLoader = isApplying || showMinWindow;

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
            0% { background-position: 0 0, 10px 0, 20px 0, 30px 0; }
            25% { background-position: 10px 0, 20px 0, 30px 0, 0 0; }
            50% { background-position: 20px 0, 30px 0, 0 0, 10px 0; }
            75% { background-position: 30px 0, 0 0, 10px 0, 20px 0; }
            100% { background-position: 0 0, 10px 0, 20px 0, 30px 0; }
          }
        `}
      </style>
      <thead className="table-header">
        <tr className="h-12 text-xs sm:text-sm">
          <th className="px-2 py-3"></th>{/* Chevron column */}
          {headers.map(({ key, label }) => (
            <th
              key={key}
              scope="col"
              className={`table-header-th px-2 sm:px-6 py-3 ${key === 'cpus' || key === 'ram' || key === 'hdd_sizes' ? 'narrow-col' : ''} cursor-pointer`}
              onClick={() => handleSort(key)}
            >
              {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
          ))}
          <th scope="col" className="px-2 py-3 border-gray-700">
            {showLoader ? <div className="header-loader"></div> : 'VM Config'}
          </th>
          <th scope="col" className="px-2 sm:px-6 py-3 narrow-col">State</th>
          <th scope="col" className="px-2 py-3">Actions</th>
        </tr>
      </thead>
    </>
  );
};

export default TableHeader;
