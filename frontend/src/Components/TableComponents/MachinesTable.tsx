import { useState } from 'react';
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

  const vmMutation = useVMMutation(auth, node, queryClient, addAlert, setPendingActions);
  const snapshotMutation = useSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);
  const deleteSnapshotMutation = useDeleteSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);

  const refreshVMs = () => queryClient.invalidateQueries(['vms']);

  return (
    <>
      <div className="overflow-x-auto mb-10 glass-panel rounded-xl border border-white/10 shadow-2xl backdrop-blur-md">
        <div className="min-w-[640px] sm:min-w-full">
          <table className="w-full text-xs sm:text-sm text-gray-200 border-collapse">
            <TableHeader
              sortConfig={sortConfig}
              handleSort={handleSort}
              isSticky={expandedRows.size === 0}
            />
            <tbody>
              {sortedVms.map((vm, idx) => {
                const prevVm = sortedVms[idx - 1];
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
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MachinesTable;