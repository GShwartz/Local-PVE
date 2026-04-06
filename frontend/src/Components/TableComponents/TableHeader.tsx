import { useRef, useEffect } from 'react';
import { VM } from '../../types';

interface TableHeaderProps {
  sortConfig: { key: keyof VM; direction: 'asc' | 'desc' };
  handleSort: (key: keyof VM) => void;
  isSticky: boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onToggleAll: () => void;
}

const TableHeader = ({ sortConfig, handleSort, isSticky, isAllSelected, isIndeterminate, onToggleAll }: TableHeaderProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const headers: { key: keyof VM; label: string }[] = [
    { key: 'vmid',      label: 'ID'         },
    { key: 'name',      label: 'Name'       },
    { key: 'ip_address',label: 'IP Address' },
    { key: 'os',        label: 'OS'         },
    { key: 'cpus',      label: 'Cores'      },
    { key: 'ram',       label: 'RAM'        },
    { key: 'hdd_sizes', label: 'HDD'        },
  ];

  return (
    <thead className={`bg-gray-50 border-b border-gray-200 ${isSticky ? 'sticky top-0 z-10' : ''}`}>
      <tr className="h-11 text-xs">
        {/* Checkbox */}
        <th className="px-3 py-3 w-10">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleAll}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer
                       focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0 accent-blue-600"
          />
        </th>

        {/* Expand toggle */}
        <th className="px-2 py-3 w-8" />

        {headers.map(({ key, label }) => (
          <th
            key={key}
            scope="col"
            onClick={() => handleSort(key)}
            className={`px-3 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]
                        cursor-pointer hover:text-gray-800 transition-colors select-none
                        ${key === 'cpus' || key === 'ram' || key === 'hdd_sizes' ? 'narrow-col' : ''}`}
          >
            <div className="flex items-center justify-center gap-1">
              {label}
              {sortConfig.key === key ? (
                <span className="text-blue-500 font-bold text-xs">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              ) : (
                <span className="text-gray-300 text-xs">↕</span>
              )}
            </div>
          </th>
        ))}
        <th scope="col" className="px-2 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
          VM Config
        </th>
        <th scope="col" className="px-2 py-3 text-center narrow-col font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
          State
        </th>
        <th scope="col" className="px-2 py-3 text-center rounded-tr-lg font-semibold text-gray-500 uppercase tracking-wider text-[11px]">
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default TableHeader;
