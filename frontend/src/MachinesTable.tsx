import { useState, useRef, useEffect } from 'react';
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
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [pollingVms, setPollingVms] = useState<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissAlert = () => {
    setIsVisible(false);
    setTimeout(() => {
      setAlert(null);
      setIsVisible(true); // Reset for next alert
    }, 300);
  };

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message });
    setIsVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(dismissAlert, 5000);
  };

  useEffect(() => {
    if (pollingVms.size > 0) {
      const interval = setInterval(() => {
        queryClient.refetchQueries({ queryKey: ['vms'] });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pollingVms, queryClient]);

  useEffect(() => {
    if (pollingVms.size > 0) {
      const stillPolling = new Set(pollingVms);
      for (const vmid of pollingVms) {
        const vm = vms.find((v) => v.vmid === vmid);
        if (vm && vm.ip_address !== 'N/A') {
          stillPolling.delete(vmid);
        }
      }
      if (stillPolling.size !== pollingVms.size) {
        setPollingVms(stillPolling);
      }
    }
  }, [vms, pollingVms]);

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
    onMutate: (variables: { vmid: number; action: string; name: string }) => {
      showAlert('info', `Initiating ${variables.action} for ${variables.name}...`);
    },
    onSuccess: (upid: string, variables: { vmid: number; action: string; name: string }) => {
      const pollTask = async () => {
        try {
          const { data: taskStatus } = await axios.get<TaskStatus>(
            `${API_BASE}/task/${node}/${upid}`,
            { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
          );
          if (taskStatus.status === 'stopped') {
            if (taskStatus.exitstatus === 'OK') {
              showAlert('success', `${variables.action.charAt(0).toUpperCase() + variables.action.slice(1)} completed for ${variables.name}.`);
              queryClient.invalidateQueries({ queryKey: ['vms'] });
              if (variables.action === 'start') {
                setPollingVms((prev) => {
                  const newSet = new Set([...prev, variables.vmid]);
                  return newSet;
                });
                setTimeout(() => {
                  setPollingVms((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(variables.vmid);
                    return newSet;
                  });
                }, 120000);
              }
            } else {
              showAlert('danger', `${variables.action.charAt(0).toUpperCase() + variables.action.slice(1)} failed for ${variables.name}: ${taskStatus.exitstatus}`);
            }
            return;
          }
          setTimeout(pollTask, 1000);
        } catch (error: any) {
          showAlert('danger', `Polling failed for ${variables.name}: ${error?.message || 'Unknown error'}`);
          console.error('Polling failed:', error);
        }
      };
      pollTask();
    },
    onError: (error: any, variables: { vmid: number; action: string; name: string }) => {
      showAlert('danger', `Failed to initiate ${variables.action} for ${variables.name}: ${error?.response?.data?.detail || error.message}`);
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

  const getAlertClasses = (type: string) => {
    const colors: Record<string, { text: string; bg: string; darkText: string; buttonBg: string; buttonText: string; buttonHover: string; buttonRing: string; darkHoverText?: string }> = {
      info: { text: 'blue-800', bg: 'blue-50', darkText: 'blue-400', buttonBg: 'blue-50', buttonText: 'blue-500', buttonHover: 'blue-200', buttonRing: 'blue-400' },
      danger: { text: 'red-800', bg: 'red-50', darkText: 'red-400', buttonBg: 'red-50', buttonText: 'red-500', buttonHover: 'red-200', buttonRing: 'red-400' },
      success: { text: 'green-800', bg: 'green-50', darkText: 'green-400', buttonBg: 'green-50', buttonText: 'green-500', buttonHover: 'green-200', buttonRing: 'green-400' },
      warning: { text: 'yellow-800', bg: 'yellow-50', darkText: 'yellow-300', buttonBg: 'yellow-50', buttonText: 'yellow-500', buttonHover: 'yellow-200', buttonRing: 'yellow-400' },
      dark: { text: 'gray-800', bg: 'gray-50', darkText: 'gray-300', buttonBg: 'gray-50', buttonText: 'gray-500', buttonHover: 'gray-200', buttonRing: 'gray-400', darkHoverText: 'white' },
    };
    return colors[type] || colors.info;
  };

  return (
    <>
      {alert && (
        <div
          className={`flex items-center p-4 mb-4 rounded-lg ${
            alert.type === 'dark' ? 'bg-gray-50 dark:bg-gray-800' : `text-${getAlertClasses(alert.type).text} bg-${getAlertClasses(alert.type).bg} dark:bg-gray-800 dark:text-${getAlertClasses(alert.type).darkText}`
          } transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          role="alert"
        >
          <svg
            className={`flex-shrink-0 w-4 h-4 ${alert.type === 'dark' ? 'text-gray-800 dark:text-gray-300' : ''}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
          </svg>
          <span className="sr-only">Info</span>
          <div
            className={`ms-3 text-sm font-medium ${alert.type === 'dark' ? 'text-gray-800 dark:text-gray-300' : ''}`}
          >
            {alert.message}
          </div>
          <button
            type="button"
            className={`ms-auto -mx-1.5 -my-1.5 bg-${getAlertClasses(alert.type).buttonBg} text-${getAlertClasses(alert.type).buttonText} rounded-lg focus:ring-2 focus:ring-${getAlertClasses(alert.type).buttonRing} p-1.5 hover:bg-${getAlertClasses(alert.type).buttonHover} inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-${getAlertClasses(alert.type).darkText} dark:hover:bg-gray-700 ${getAlertClasses(alert.type).darkHoverText ? `dark:hover:text-${getAlertClasses(alert.type).darkHoverText}` : ''}`}
            onClick={dismissAlert}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg
              className="w-3 h-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
          </button>
        </div>
      )}
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
                        vmMutation.mutate({ vmid: vm.vmid, action: 'start', name: vm.name });
                      }}
                      disabled={vm.status === 'running'}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-transform duration-100 ${
                        vm.status === 'running'
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 active:scale-95 active:bg-green-800'
                      } text-white`}
                    >
                      Start
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vmMutation.mutate({ vmid: vm.vmid, action: 'stop', name: vm.name });
                      }}
                      disabled={vm.status !== 'running'}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-transform duration-100 ${
                        vm.status !== 'running'
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 active:scale-95 active:bg-red-800'
                      } text-white`}
                    >
                      Stop
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown', name: vm.name });
                      }}
                      disabled={vm.status !== 'running'}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-transform duration-100 ${
                        vm.status !== 'running'
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-yellow-600 hover:bg-yellow-700 active:scale-95 active:bg-yellow-800'
                      } text-white`}
                    >
                      Shutdown
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vmMutation.mutate({ vmid: vm.vmid, action: 'reboot', name: vm.name });
                      }}
                      disabled={vm.status !== 'running'}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-transform duration-100 ${
                        vm.status !== 'running'
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 active:bg-indigo-800'
                      } text-white`}
                    >
                      Reboot
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        vmMutation.mutate({ vmid: vm.vmid, action: 'hibernate', name: vm.name });
                      }}
                      disabled={vm.status !== 'running'}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-transform duration-100 ${
                        vm.status !== 'running'
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700 active:scale-95 active:bg-purple-800'
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
    </>
  );
};

export default MachinesTable;