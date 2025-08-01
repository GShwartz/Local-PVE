import { useQuery, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import axios from 'axios';
import { VM, Auth, Snapshot, TaskStatus } from '../../types';

import VMNameCell from './VMNameCell';
import CPUCell from './CPUCell';
import RAMCell from './RAMCell';
import ActionButtons from './ActionButtons';
import ApplyButton from './ApplyButton';
import HDDCell from './HDDCell';
import StatusBadge from './StatusBadge';
import ExpandedRow from './ExpandedRow';

interface VMConfigResponse {
  name?: string;
  cores?: number;
  memory?: number;
  ostype?: string;
  ip_address?: string;
  hdd_sizes?: string;
  num_hdd?: number;
  hdd_free?: string;
  status?: string;
}

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: Set<number>;
  showSnapshots: (vmid: number) => void;
  openModal: (vmid: number, vmName: string) => void;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string; name?: string; cpus?: number; ram?: number }, unknown>;
  snapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, { vmid: number; snapname: string; name?: string }, unknown>;
  auth: Auth;
  node: string;
  openEditModal: (vm: VM) => void;
  editingVmid: number | null;
  cancelEdit: () => void;
  addAlert: (message: string, type: string) => void;
  setTableApplying: (isApplying: boolean) => void;
  refreshVMs: () => void;
}

const getSnapshots = async ({ node, vmid, csrf, ticket }: { node: string; vmid: number; csrf: string; ticket: string }): Promise<Snapshot[]> => {
  const { data } = await axios.get<Snapshot[]>(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/snapshots`,
    { params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const getVMStatus = async ({ node, vmid, csrf, ticket }: { node: string; vmid: number; csrf: string; ticket: string }): Promise<string> => {
  const { data } = await axios.get<{ status: string }>(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/status`,
    { params: { csrf_token: csrf, ticket } }
  );
  return data.status;
};

const getVMInfo = async ({ node, vmid, csrf, ticket }: { node: string; vmid: number; csrf: string; ticket: string }): Promise<VM> => {
  const { data } = await axios.get<VMConfigResponse>(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/config`,
    { params: { csrf_token: csrf, ticket } }
  );
  return {
    vmid,
    name: data.name || `VM ${vmid}`,
    cpus: data.cores || 0,
    ram: data.memory || 0,
    status: data.status || 'stopped',
    os: data.ostype && data.ostype.toLowerCase().includes('win') ? 'Windows' : 'Linux',
    ip_address: data.ip_address || 'N/A',
    hdd_sizes: data.hdd_sizes || 'N/A',
    num_hdd: data.num_hdd || 0,
    hdd_free: data.hdd_free || 'N/A',
  };
};

const parseRAMToNumber = (ram: string): number => {
  if (ram.endsWith('GB')) return parseInt(ram.replace('GB', '')) * 1024;
  return parseInt(ram.replace('MB', ''));
};

const TableRow = ({
  vm,
  expandedRows,
  toggleRow,
  snapshotView,
  showSnapshots,
  openModal,
  pendingActions,
  vmMutation,
  snapshotMutation,
  deleteSnapshotMutation,
  auth,
  node,
  openEditModal,
  editingVmid,
  cancelEdit,
  addAlert,
  setTableApplying,
  refreshVMs,
}: TableRowProps) => {
  const queryClient = useQueryClient();

  const { data: snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots', node, vm.vmid, auth.csrf_token, auth.ticket],
    queryFn: () => getSnapshots({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: snapshotView.has(vm.vmid),
  });

  const [changesToApply, setChangesToApply] = useState<{ vmname: string | null; cpu: number | null; ram: string | null }>({
    vmname: null,
    cpu: null,
    ram: null,
  });

  const [isApplying, setIsApplying] = useState(false);
  const hasChanges = changesToApply.vmname !== null || changesToApply.cpu !== null || changesToApply.ram !== null;
  const requiresVMStopped = (changesToApply.cpu !== null || changesToApply.ram !== null) && vm.status === 'running';

  const handleApplyChanges = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsApplying(true);
    setTableApplying(true);

    try {
      const latestStatus = await getVMStatus({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket });
      const updates: { name?: string; cpus?: number; ram?: number } = {};
      if (changesToApply.vmname) updates.name = changesToApply.vmname;
      if (changesToApply.cpu !== null) updates.cpus = changesToApply.cpu;
      if (changesToApply.ram !== null) updates.ram = parseRAMToNumber(changesToApply.ram);

      if (Object.keys(updates).length === 0) {
        setIsApplying(false);
        setTableApplying(false);
        return;
      }

      if ((updates.cpus || updates.ram) && latestStatus === 'running') {
        addAlert(`Cannot apply CPU or RAM changes for running VM ${vm.vmid}`, 'error');
        setIsApplying(false);
        setTableApplying(false);
        return;
      }

      vmMutation.mutate({ vmid: vm.vmid, action: 'update_config', ...updates }, {
        onSuccess: async (upid: string) => {
          try {
            let taskStatus;
            do {
              const { data } = await axios.get<TaskStatus>(
                `http://localhost:8000/task/${node}/${upid}`,
                { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
              );
              taskStatus = data;
              if (taskStatus.status !== 'stopped') await new Promise(resolve => setTimeout(resolve, 500));
            } while (taskStatus.status !== 'stopped');

            if (taskStatus.exitstatus !== 'OK') throw new Error(`Task failed: ${taskStatus.exitstatus}`);
            await new Promise(resolve => setTimeout(resolve, 15000));

            const updatedVM = await getVMInfo({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket });
            queryClient.setQueryData(['vms'], (oldVms: VM[] | undefined) => {
              if (!oldVms) return [updatedVM];
              return oldVms.map((oldVm) => (oldVm.vmid === vm.vmid ? updatedVM : oldVm));
            });

            setChangesToApply({ vmname: null, cpu: null, ram: null });
            cancelEdit();
            addAlert(`VM ${vm.vmid} updated successfully`, 'success');
          } catch {
            addAlert(`Failed to update VM info for ${vm.vmid}`, 'error');
          } finally {
            setIsApplying(false);
            setTableApplying(false);
          }
        },
        onError: (error: any) => {
          addAlert(`Failed to update VM ${vm.vmid}: ${error.message}`, 'error');
          setIsApplying(false);
          setTableApplying(false);
        },
      });
    } catch (error) {
      addAlert(`Failed to fetch VM status for ${vm.vmid}`, 'error');
      setIsApplying(false);
      setTableApplying(false);
    }
  };

  return (
    <>
      {requiresVMStopped && (
        <tr>
          <td colSpan={11} className="bg-yellow-600 text-white text-center py-2">
            <span className="text-sm font-medium">
              CPU or RAM changes require the VM to be stopped. Please stop the VM before applying changes.
            </span>
          </td>
        </tr>
      )}

      <tr className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700" style={{ height: '48px' }}>
        <td className="px-6 py-4 text-center">{vm.vmid}</td>
        <VMNameCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
        <td className="px-6 py-4 text-center">{vm.ip_address}</td>
        <td className="px-6 py-4 text-center">{vm.os}</td>
        <CPUCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
        <RAMCell {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying }} />
        <HDDCell hdd_sizes={vm.hdd_sizes} />
        <td className="px-2 py-2 text-center border-r border-gray-700">
          <ApplyButton onClick={handleApplyChanges} hasChanges={hasChanges} requiresVMStopped={requiresVMStopped} isApplying={isApplying} />
        </td>
        <td className="px-6 py-4 text-center narrow-col border-r border-gray-700">
          <StatusBadge status={vm.status} />
        </td>
        <td className="px-2 py-2 text-center">
          <ActionButtons
            vm={vm}
            pendingActions={pendingActions}
            vmMutation={vmMutation}
            showSnapshots={showSnapshots}
            onToggleRow={() => toggleRow(vm.vmid)}
            auth={auth}
            addAlert={addAlert}
            refreshVMs={refreshVMs}
            queryClient={queryClient}
          />
        </td>
        <td className="px-2 py-4 text-center cursor-pointer" onClick={() => toggleRow(vm.vmid)}>
          {expandedRows.has(vm.vmid) && !snapshotView.has(vm.vmid) ? '▲' : '▼'}
        </td>
      </tr>

      <ExpandedRow
        vm={vm}
        snapshotView={snapshotView}
        expandedRows={expandedRows}
        openModal={openModal}
        snapshotMutation={snapshotMutation}
        deleteSnapshotMutation={deleteSnapshotMutation}
        pendingActions={pendingActions}
        snapshots={snapshots}
        snapshotsLoading={snapshotsLoading}
        snapshotsError={snapshotsError}
      />
    </>
  );
};

export default TableRow;