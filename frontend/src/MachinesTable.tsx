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
  const [sortConfig, setSortConfig] = useState<{ key: keyof VM; direction: 'asc' | 'desc' }>({ key: 'vmid', direction: 'asc' });
  const [alerts, setAlerts] = useState<{ id: string; message: string; type: string }[]>([]);

  const toggleRow = (vmid: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vmid)) {
      newExpanded.delete(vmid);
    } else {
      newExpanded.add(vmid);
    }
    setExpandedRows(newExpanded);
  };

  const addAlert = (message: string, type: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 5000); // Auto-dismiss after 5 seconds
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const vmMutation = useMutation({
    mutationFn: ({ vmid, action }: { vmid: number; action: string }) =>
      controlVM({ node, vmid, action, csrf: auth.csrf_token, ticket: auth.ticket }),
    onSuccess: (upid: string, { action, vmid }: { vmid: number; action: string }) => {
      addAlert(`VM ${vmid} ${action} initiated successfully.`, 'success');
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus !== 'OK') {
              addAlert(`VM ${vmid} ${action} failed: ${taskStatus.exitstatus}`, 'error');
            } else {
              addAlert(`VM ${vmid} ${action} completed successfully.`, 'success');
            }
            const delayIfNeeded = ['start', 'reboot'].includes(action) ? 15000 : 0;
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['vms'] });
            }, delayIfNeeded);
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error) {
          addAlert(`Polling for VM ${vmid} ${action} failed.`, 'error');
        }
      };
      pollTask();
    },
    onError: (error: any, { vmid, action }: { vmid: number; action: string }) => {
      addAlert(`VM ${vmid} ${action} failed: ${error?.response?.data?.detail || error.message}`, 'error');
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
      : bStr.localeCompare(bStr);
  });

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'flex items-center p-4 text-green-800 rounded-lg bg-green-50/50 dark:bg-gray-800/50 dark:text-green-400';
      case 'error':
        return 'flex items-center p-4 text-red-800 rounded-lg bg-red-50/50 dark:bg-gray-800/50 dark:text-red-400';
      case 'info':
        return 'flex items-center p-4 text-blue-800 rounded-lg bg-blue-50/50 dark:bg-gray-800/50 dark:text-blue-400';
      case 'warning':
        return 'flex items-center p-4 text-yellow-800 rounded-lg bg-yellow-50/50 dark:bg-gray-800/50 dark:text-yellow-300';
      default:
        return 'flex items-center p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const getButtonStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'ms-auto -mx-1 -my-1 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1 hover:bg-green-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700';
      case 'error':
        return 'ms-auto -mx-1 -my-1 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1 hover:bg-red-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700';
      case 'info':
        return 'ms-auto -mx-1 -my-1 bg-blue-50 text-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 p-1 hover:bg-red-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700';
      case 'warning':
        return 'ms-auto -mx-1 -my-1 bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1 hover:bg-yellow-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700';
      default:
        return 'ms-auto -mx-1 -my-1 bg-gray-50 text-gray-500 rounded-lg focus:ring-2 focus:ring-gray-400 p-1 hover:bg-gray-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';
    }
  };

  return (
    <>
      <div className="fixed top-16 right-8 flex flex-col space-y-2 z-50">
        {alerts.map((alert) => (
          <div key={alert.id} className={getAlertStyles(alert.type)} role="alert">
            <svg className="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
            </svg>
            <span className="sr-only">Info</span>
            <div className="ms-3 me-4 text-sm font-medium">
              {alert.message}
            </div>
            <button
              type="button"
              className={getButtonStyles(alert.type)}
              onClick={() => dismissAlert(alert.id)}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm text-gray-300 border-collapse">
          <thead className="text-xs uppercase bg-gray-800 text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('vmid')}>
                ID {sortConfig.key === 'vmid' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('name')}>
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('ip_address')}>
                IP Address {sortConfig.key === 'ip_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSort('os')}>
                OS {sortConfig.key === 'os' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center narrow-col" onClick={() => handleSort('cpus')}>
                CPU (Cores) {sortConfig.key === 'cpus' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center narrow-col" onClick={() => handleSort('ram')}>
                RAM (MB) {sortConfig.key === 'ram' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center narrow-col" onClick={() => handleSort('hdd_sizes')}>
                HDD Sizes {sortConfig.key === 'hdd_sizes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-6 py-3 cursor-pointer text-center narrow-col" onClick={() => handleSort('status')}>
                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="px-2 py-3 w-8"></th>
              <th scope="col" className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedVms.map((vm) => (
              <>
                <tr
                  key={vm.vmid}
                  className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
                  onClick={() => toggleRow(vm.vmid)}
                >
                  <td className="px-6 py-4 text-center">{vm.vmid}</td>
                  <td className="px-6 py-4 text-center">{vm.name}</td>
                  <td className="px-6 py-4 text-center">{vm.ip_address}</td>
                  <td className="px-6 py-4 text-center">{vm.os}</td>
                  <td className="px-6 py-4 text-center narrow-col">{vm.cpus}</td>
                  <td className="px-6 py-4 text-center narrow-col">{vm.ram}</td>
                  <td className="px-6 py-4 text-center narrow-col">{vm.hdd_sizes}</td>
                  <td className="px-6 py-4 text-center narrow-col">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        vm.status === 'running' ? 'bg-green-600 text-white' : 
                        vm.status === 'suspended' ? 'bg-yellow-600 text-white' : 
                        'bg-red-600 text-white'
                      }`}
                    >
                      {vm.status}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-center">
                    {expandedRows.has(vm.vmid) ? '▼' : ''}
                  </td>
                  <td className="px-6 py-4 text-center flex space-x-2 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vmMutation.mutate({ vmid: vm.vmid, action: 'start' });
                      }}
                      disabled={vm.status === 'running' || vm.status === 'suspended'}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        vm.status === 'running' || vm.status === 'suspended'
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
                  </td>
                </tr>
                {expandedRows.has(vm.vmid) && (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 bg-gray-800 text-center">
                      <div className="expanded-content">
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
    </>
  );
};

export default MachinesTable;