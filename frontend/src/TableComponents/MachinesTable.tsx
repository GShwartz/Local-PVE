import { useState } from 'react';
import TableHeader from './TableHeader';
import TableRow from './TableRow';
import SnapshotModal from '../Components/SnapshotModal';
import { Auth, VM } from '../types';
import { useVMMutation, useSnapshotMutation, useDeleteSnapshotMutation, useCreateSnapshotMutation } from '../Components/vmMutations';

interface MachinesTableProps {
  vms: VM[];
  auth: Auth;
  queryClient: any;
  node: string;
  addAlert: (message: string, type: string) => void;
}

const MachinesTable = ({ vms, auth, queryClient, node, addAlert }: MachinesTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [snapshotView, setSnapshotView] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof VM; direction: 'asc' | 'desc' }>({ key: 'vmid', direction: 'asc' });
  const [pendingActions, setPendingActions] = useState<{ [vmid: number]: string[] }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [currentVmid, setCurrentVmid] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentVM, setCurrentVM] = useState<VM | null>(null);

  const toggleRow = (vmid: number): void => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(vmid)) {
      newExpanded.delete(vmid);
      if (snapshotView === vmid) setSnapshotView(null);
    } else {
      newExpanded.clear();
      newExpanded.add(vmid);
      if (snapshotView && snapshotView !== vmid) setSnapshotView(null);
    }
    setExpandedRows(newExpanded);
  };

  const showSnapshots = (vmid: number): void => {
    if (snapshotView === vmid && expandedRows.has(vmid)) {
      setSnapshotView(null);
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(vmid);
      setExpandedRows(newExpanded);
    } else {
      const newExpanded = new Set(expandedRows);
      newExpanded.clear();
      newExpanded.add(vmid);
      setExpandedRows(newExpanded);
      setSnapshotView(vmid);
    }
  };

  const openModal = (vmid: number, _vmName: string): void => {
    setCurrentVmid(vmid);
    setSnapshotName('');
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setCurrentVmid(null);
    setSnapshotName('');
  };

  const openEditModal = (vm: VM): void => {
    setCurrentVM(vm);
    setIsEditModalOpen(true);
  };

  const closeEditModal = (): void => {
    setIsEditModalOpen(false);
    setCurrentVM(null);
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
    const aValue: VM[keyof VM] = a[sortConfig.key];
    const bValue: VM[keyof VM] = b[sortConfig.key];

    if (aValue == null || bValue == null) return 0;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr: string = aValue.toString().toLowerCase();
    const bStr: string = bValue.toString().toLowerCase();
    return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : -aStr.localeCompare(bStr);
  });

  const vmMutation = useVMMutation(auth, node, queryClient, addAlert, setPendingActions);
  const snapshotMutation = useSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);
  const deleteSnapshotMutation = useDeleteSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions);
  const createSnapshotMutation = useCreateSnapshotMutation(auth, node, queryClient, addAlert, setPendingActions, closeModal);

  const isValidSnapshotName = (name: string): boolean => {
    const regex = /^[a-zA-Z0-9_+.-]{1,40}$/;
    return regex.test(name);
  };

  return (
    <>
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm text-gray-200 border-collapse">
          <TableHeader sortConfig={sortConfig} handleSort={handleSort} />
          <tbody>
            {sortedVms.map((vm) => (
              <TableRow
                key={vm.vmid}
                vm={vm}
                expandedRows={expandedRows}
                toggleRow={toggleRow}
                snapshotView={snapshotView}
                showSnapshots={showSnapshots}
                openModal={openModal}
                pendingActions={pendingActions}
                vmMutation={vmMutation}
                snapshotMutation={snapshotMutation}
                deleteSnapshotMutation={deleteSnapshotMutation}
                auth={auth}
                node={node}
                openEditModal={openEditModal}
              />
            ))}
          </tbody>
        </table>
      </div>
      <SnapshotModal
        isOpen={isModalOpen}
        closeModal={closeModal}
        snapshotName={snapshotName}
        setSnapshotName={setSnapshotName}
        currentVmid={currentVmid}
        createSnapshotMutation={createSnapshotMutation}
        isValidSnapshotName={isValidSnapshotName}
        addAlert={addAlert}
        node={node}
        auth={auth}
      />
      {isEditModalOpen && currentVM && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-white">Edit VM: {currentVM.name}</h2>
            {/* Add edit form here */}
            <button
              onClick={closeEditModal}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MachinesTable;