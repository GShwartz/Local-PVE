import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// Define types (assume imported or defined in a types file)
interface Auth {
  ticket: string;
  csrf_token: string;
}

interface VM {
  vmid: number;
  name: string;
  status: string;
  os: string;
  cpus: number;
  ram: number;
  num_hdd: number;
  hdd_sizes: string;
  ip_address: string;
}

interface TaskStatus {
  status: string;
  exitstatus?: string;
}

interface MachinesTableProps {
  vms: VM[];
  auth: Auth;
  queryClient: any; // From @tanstack/react-query
  node: string;
}

const API_BASE = 'http://localhost:8000'; // Backend URL (env var in prod)

const controlVM = async ({ node, vmid, action, csrf, ticket }: { node: string; vmid: number; action: string; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.post<string>(
    `${API_BASE}/vm/${node}/${vmid}/${action}`,
    {},
    { headers: { 'CSRFPreventionToken': csrf }, params: { csrf_token: csrf, ticket } }
  );
  return data; // UPID
};

const MachinesTable = ({ vms, auth, queryClient, node }: MachinesTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof VM | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const toggleRow = (vmid: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vmid)) {
      newExpanded.delete(vmid);
    } else {
      newExpanded.add(vmid);
    }
    setExpandedRows(newExpanded);
  };

  const vmMutation = useMutation({
    mutationFn: ({ vmid, action }: { vmid: number; action: string }) =>
      controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket }),
    onSuccess: (upid: string) => {
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus === 'OK') {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
            } else {
              console.error('Task failed:', taskStatus.exitstatus);
            }
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          console.error('Polling failed:', error);
        }
      };
      pollTask();
    },
    onError: (error: any) => {
      console.error('VM action failed:', error?.response?.data?.detail || error.message);
    },
  });

  const handleSort = (key: keyof VM) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Function to check if an IP is a loopback (starts with 127.)
  const isLoopbackIP = (ip: string) => ip.trim().startsWith('127.');

  // Filter out loopback IPs from potentially comma-separated list
  const filteredVms = vms.map((vm) => {
    const ips = vm.ip_address.split(',').map(ip => ip.trim());
    const nonLoopbackIps = ips.filter(ip => !isLoopbackIP(ip));
    return {
      ...vm,
      ip_address: nonLoopbackIps.join(', '), // Join with comma and space for readability
    };
  });

  const sortedVms = [...filteredVms].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null || bValue === null) return 0;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr = aValue.toString().toLowerCase();
    const bStr = bValue.toString().toLowerCase();
    return sortConfig.direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-300 border-collapse">
        <thead className="text-xs uppercase bg-gray-800 text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('vmid')}>
              ID {sortConfig.key === 'vmid' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('name')}>
              Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('status')}>
              Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('os')}>
              OS {sortConfig.key === 'os' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('cpus')}>
              CPU (Cores) {sortConfig.key === 'cpus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('ram')}>
              RAM (MB) {sortConfig.key === 'ram' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('hdd_sizes')}>
              HDD Sizes {sortConfig.key === 'hdd_sizes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('ip_address')}>
              IP Address {sortConfig.key === 'ip_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th scope="col" className="px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedVms.map((vm) => (
            <>
              <tr
                key={vm.vmid}
                className="bg-gray-900 border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
                onClick={() => toggleRow(vm.vmid)}
              >
                <td className="px-6 py-4 text-center">{vm.vmid}</td>
                <td className="px-6 py-4 text-center">{vm.name}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      vm.status === 'running' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {vm.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">{vm.os}</td>
                <td className="px-6 py-4 text-center">{vm.cpus}</td>
                <td className="px-6 py-4 text-center">{vm.ram}</td>
                <td className="px-6 py-4 text-center">{vm.hdd_sizes}</td>
                <td className="px-6 py-4 text-center">{vm.ip_address}</td>
                <td className="px-6 py-4 text-center flex space-x-2 justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vmMutation.mutate({ vmid: vm.vmid, action: 'start' });
                    }}
                    disabled={vm.status === 'running'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      vm.status === 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    Start
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vmMutation.mutate({ vmid: vm.vmid, action: 'stop' });
                    }}
                    disabled={vm.status !== 'running'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      vm.status !== 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    Stop
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown' });
                    }}
                    disabled={vm.status !== 'running'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      vm.status !== 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    } text-white`}
                  >
                    Shutdown
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vmMutation.mutate({ vmid: vm.vmid, action: 'reboot' });
                    }}
                    disabled={vm.status !== 'running'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      vm.status !== 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } text-white`}
                  >
                    Reboot
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      vmMutation.mutate({ vmid: vm.vmid, action: 'hibernate' });
                    }}
                    disabled={vm.status !== 'running'}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      vm.status !== 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white`}
                  >
                    Hibernate
                  </button>
                </td>
              </tr>
              {expandedRows.has(vm.vmid) && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 bg-gray-800 overflow-auto text-center" style={{ maxHeight: '40vh' }}>
                    <div>
                      Expanded details for {vm.name}:
                      <pre className="text-sm overflow-auto">{JSON.stringify(vm, null, 2)}</pre>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MachinesTable;