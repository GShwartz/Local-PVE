import { useState, useMemo } from 'react';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import { Auth, VM } from '../../types';
import {
  useVMMutation,
  useSnapshotMutation,
  useDeleteSnapshotMutation,
} from '../vmMutations';

interface MachinesTableProps {
  vms: VM[];
  auth: Auth;
  queryClient: any;
  node: string;
  addAlert: (message: string, type: string) => void;
  openConsole: (vmid: number) => void;
}

const MachinesTable = ({ vms, auth, queryClient, node, addAlert, openConsole }: MachinesTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [snapshotView, setSnapshotView] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof VM; direction: 'asc' | 'desc' }>({ key: 'vmid', direction: 'asc' });
  const [pendingActions, setPendingActions] = useState<{ [vmid: number]: string[] }>({});
  const [editingVmid, setEditingVmid] = useState<number | null>(null);
  const [selectedVmids, setSelectedVmids] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelect = (vmid: number) => {
    setSelectedVmids(prev => {
      const next = new Set(prev);
      if (next.has(vmid)) next.delete(vmid); else next.add(vmid);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedVmids(selectedVmids.size === displayedVms.length
      ? new Set()
      : new Set(displayedVms.map(vm => vm.vmid))
    );
  };

  const LOADER_MIN_DURATION = 5000;

  const openEditModal = (vm: VM) => {
    if (editingVmid === null || editingVmid === vm.vmid) setEditingVmid(vm.vmid);
  };

  const cancelEdit = () => setEditingVmid(null);

  const toggleRow = (vmid: number): void => {
    const newExpanded = new Set(expandedRows);
    const newSnapshotView = new Set(snapshotView);

    if (newExpanded.has(vmid)) {
      newExpanded.delete(vmid);
      newSnapshotView.delete(vmid);
    } else {
      newExpanded.add(vmid);
      newSnapshotView.add(vmid);
    }

    setExpandedRows(newExpanded);
    setSnapshotView(newSnapshotView);
  };

  const showSnapshots = (vmid: number): void => {
    const newSnapshotView = new Set(snapshotView);
    const newExpanded = new Set(expandedRows);
    if (newSnapshotView.has(vmid)) {
      newSnapshotView.delete(vmid);
      newExpanded.delete(vmid);
    } else {
      newSnapshotView.add(vmid);
      newExpanded.add(vmid);
    }
    setExpandedRows(newExpanded);
    setSnapshotView(newSnapshotView);
  };


  const handleSort = (key: keyof VM): void => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const isLoopbackIP = (ip: string): boolean => ip.trim().startsWith('127.');

  const filteredVms: VM[] = vms.map((vm: VM) => {
    const ips: string[] = vm.ip_address.split(',').map(ip => ip.trim());
    const nonLoopbackIps: string[] = ips.filter((ip: string) => !isLoopbackIP(ip));
    return { ...vm, ip_address: nonLoopbackIps.join(', ') };
  });

  const sortedVms: VM[] = [...filteredVms].sort((a: VM, b: VM) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue == null || bValue == null) return 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    const aStr = aValue.toString().toLowerCase();
    const bStr = bValue.toString().toLowerCase();
    return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : -aStr.localeCompare(bStr);
  });

  const displayedVms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedVms;
    return sortedVms.filter(vm =>
      vm.name?.toLowerCase().includes(q) || vm.os?.toLowerCase().includes(q)
    );
  }, [sortedVms, searchQuery]);

  const vmMutation = useVMMutation(auth, node, queryClient, addAlert, setPendingActions);
  const snapshotMutation = useSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);
  const deleteSnapshotMutation = useDeleteSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);

  const refreshVMs = () => queryClient.invalidateQueries(['vms']);

  // Status requirements per action
  const broadcastEligible: Record<string, string[]> = {
    start:    ['stopped'],
    shutdown: ['running'],
    reboot:   ['running'],
    stop:     ['running', 'paused', 'suspended'],
  };

  const broadcastAction = (action: string) => {
    const eligible = broadcastEligible[action] ?? [];
    const vmMap = new Map(sortedVms.map(v => [v.vmid, v]));
    const eligibleVmids = [...selectedVmids].filter(vmid => {
      const vm = vmMap.get(vmid);
      return vm && eligible.includes(vm.status?.toLowerCase() || '');
    });

    if (eligibleVmids.length === 0) {
      addAlert(`No selected VMs are eligible for "${action}".`, 'warning');
      return;
    }

    // Optimistically set pending actions so button states update immediately
    setPendingActions(prev => {
      const next = { ...prev };
      eligibleVmids.forEach(vmid => {
        next[vmid] = [...(next[vmid] || []), action];
      });
      return next;
    });

    eligibleVmids.forEach(vmid => vmMutation.mutate({ vmid, action }));

    const label: Record<string, string> = { start: 'Starting', stop: 'Force stopping', shutdown: 'Shutting down', reboot: 'Rebooting' };
    const skipped = selectedVmids.size - eligibleVmids.length;
    const skippedNote = skipped > 0 ? ` (${skipped} skipped — wrong status)` : '';
    addAlert(`${label[action] ?? action} ${eligibleVmids.length} VM${eligibleVmids.length !== 1 ? 's' : ''}…${skippedNote}`, 'info');
  };

  const broadcastButtons: { action: string; label: string; color: string }[] = [
    { action: 'start',    label: 'Start All',    color: 'bg-green-600 hover:bg-green-700' },
    { action: 'shutdown', label: 'Shutdown All',  color: 'bg-amber-500 hover:bg-amber-600' },
    { action: 'reboot',   label: 'Reboot All',   color: 'bg-blue-600 hover:bg-blue-700'   },
    { action: 'stop',     label: 'Force Stop All', color: 'bg-red-600 hover:bg-red-700'   },
  ];

  return (
    <>
      {/* Search bar */}
      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or OS…"
          className="w-full max-w-xs px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* Broadcast bar — visible when 2+ VMs selected */}
      {selectedVmids.size > 1 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
          <span className="text-sm font-semibold text-blue-700 mr-1">
            {selectedVmids.size} VMs selected
          </span>
          <div className="h-4 w-px bg-blue-200" />
          {broadcastButtons.map(({ action, label, color }) => (
            <button
              key={action}
              onClick={() => broadcastAction(action)}
              className={`px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setSelectedVmids(new Set())}
            className="ml-auto px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden mb-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-gray-700 border-collapse">
          <TableHeader
            sortConfig={sortConfig}
            handleSort={handleSort}
            isSticky={expandedRows.size === 0}
            isAllSelected={displayedVms.length > 0 && selectedVmids.size === displayedVms.length}
            isIndeterminate={selectedVmids.size > 0 && selectedVmids.size < displayedVms.length}
            onToggleAll={toggleAll}
          />
          <tbody>
            {displayedVms.map((vm, idx) => {
              const prevVm = displayedVms[idx - 1];
              const hasRowAboveExpanded = prevVm ? expandedRows.has(prevVm.vmid) : false;
              return (
                <TableRow
                  key={vm.vmid}
                  vm={vm}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                  snapshotView={snapshotView}
                  showSnapshots={showSnapshots}
                  pendingActions={pendingActions}
                  vmMutation={vmMutation}
                  snapshotMutation={snapshotMutation}
                  deleteSnapshotMutation={deleteSnapshotMutation}
                  auth={auth}
                  node={node}
                  openEditModal={openEditModal}
                  editingVmid={editingVmid}
                  cancelEdit={cancelEdit}
                  hasRowAboveExpanded={hasRowAboveExpanded}
                  addAlert={addAlert}
                  openConsole={openConsole}
                  refreshVMs={refreshVMs}
                  loaderMinDuration={LOADER_MIN_DURATION}
                  isSelected={selectedVmids.has(vm.vmid)}
                  onToggleSelect={() => toggleSelect(vm.vmid)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MachinesTable;