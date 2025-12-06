import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useQuery, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { VM, Auth, Snapshot } from '../../types';
import { useApplyChanges } from '../../hooks/useApplyChanges';
import axios from 'axios';

import VMNameCell from './Row/VMNameCell';
import CPUCell from './Row/CPUCell';
import RAMCell from './Row/RAMCell';
import IPAddressCell from './Row/IPAddressCell';
import HDDCell from './Row/HDDCell';
import StatusBadge from './Row/StatusBadge';
import ActionButtons from './ActionButtons/ActionButtons';
import ApplyButton from './ActionButtons/ApplyButton';
import ExpandedRow from './ExpandedRow/ExpandedRow';

// Color schemes for different rows
const colorSchemes = [
  { primary: 'blue', secondary: 'purple', bg: 'from-blue-500/40 via-purple-500/60 to-blue-500/40', connector: 'rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.8)', shadow: 'shadow-blue-500/10', border: 'border-b-blue-500/30' },
  { primary: 'green', secondary: 'teal', bg: 'from-green-500/40 via-teal-500/60 to-green-500/40', connector: 'rgba(34, 197, 94, 0.8), rgba(20, 184, 166, 0.8)', shadow: 'shadow-green-500/10', border: 'border-b-green-500/30' },
  { primary: 'orange', secondary: 'red', bg: 'from-orange-500/40 via-red-500/60 to-orange-500/40', connector: 'rgba(249, 115, 22, 0.8), rgba(239, 68, 68, 0.8)', shadow: 'shadow-orange-500/10', border: 'border-b-orange-500/30' },
  { primary: 'purple', secondary: 'pink', bg: 'from-purple-500/40 via-pink-500/60 to-purple-500/40', connector: 'rgba(147, 51, 234, 0.8), rgba(236, 72, 153, 0.8)', shadow: 'shadow-purple-500/10', border: 'border-b-purple-500/30' },
  { primary: 'cyan', secondary: 'blue', bg: 'from-cyan-500/40 via-blue-500/60 to-cyan-500/40', connector: 'rgba(6, 182, 212, 0.8), rgba(59, 130, 246, 0.8)', shadow: 'shadow-cyan-500/10', border: 'border-b-cyan-500/30' }
];

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: Set<number>;
  showSnapshots: (vmid: number) => void;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, any, unknown>;
  snapshotMutation: UseMutationResult<string, any, any, unknown>;
  deleteSnapshotMutation: UseMutationResult<string, any, any, unknown>;
  auth: Auth;
  node: string;
  openEditModal: (vm: VM) => void;
  editingVmid: number | null;
  cancelEdit: () => void;
  addAlert: (message: string, type: string) => void;
  refreshVMs: () => void;
  openConsole: (vmid: number) => void;
  hasRowAboveExpanded: boolean;
  loaderMinDuration: number;
}

const getSnapshots = async ({
  node,
  vmid,
  csrf,
  ticket,
}: {
  node: string;
  vmid: number;
  csrf: string;
  ticket: string;
}): Promise<Snapshot[]> => {
  const { data } = await axios.get<Snapshot[]>(
    `http://localhost:8000/vm/${node}/qemu/${vmid}/snapshots`,
    { params: { csrf_token: csrf, ticket } }
  );
  return data;
};

const TableRow = ({
  vm,
  expandedRows,
  toggleRow,
  snapshotView,
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
  refreshVMs,
  loaderMinDuration,
}: TableRowProps) => {
  const queryClient = useQueryClient();

  // Get color scheme based on VM ID for consistent coloring
  const colorScheme = colorSchemes[vm.vmid % colorSchemes.length];

  // Move applying state to individual row level
  const [isApplying, setIsApplying] = useState(false);

  const { data: snapshots, isLoading: snapshotsLoading, error: snapshotsError } = useQuery({
    queryKey: ['snapshots', node, vm.vmid, auth.csrf_token, auth.ticket],
    queryFn: () =>
      getSnapshots({ node, vmid: vm.vmid, csrf: auth.csrf_token, ticket: auth.ticket }),
    enabled: snapshotView.has(vm.vmid),
  });

  const [changesToApply, setChangesToApply] = useState<{
    vmname: string | null;
    cpu: number | null;
    ram: string | null;
  }>({
    vmname: null,
    cpu: null,
    ram: null,
  });

  // Cooldown so Apply disables immediately (duration provided by MachinesTable)
  const [cooldownActive, setCooldownActive] = useState(false);
  const startCooldown = () => {
    if (cooldownActive) return;
    setCooldownActive(true);
    setTimeout(() => setCooldownActive(false), loaderMinDuration);
  };
  const isApplyingOrCooldown = isApplying || cooldownActive;

  const hasChanges =
    changesToApply.vmname !== null ||
    changesToApply.cpu !== null ||
    changesToApply.ram !== null;

  const requiresVMStopped =
    (changesToApply.cpu !== null || changesToApply.ram !== null) &&
    vm.status === 'running';

  const { applyChanges } = useApplyChanges({
    node,
    auth,
    vm,
    changesToApply,
    vmMutation,
    cancelEdit,
    setChangesToApply,
    setTableApplying: setIsApplying, // Now uses local state
    addAlert,
  });

  // Status badge hints - properly connected to ActionButtons
  const [resumeHints, setResumeHints] = useState<{ resumeShowing: boolean; resumeEnabled: boolean }>({
    resumeShowing: false,
    resumeEnabled: false,
  });
  const [rebootingHint, setRebootingHint] = useState(false);
  const [stoppingHint, setStoppingHint] = useState(false);

  // Log hint changes
  useEffect(() => {
    console.log('📡 TableRow VM', vm.vmid, 'received hints:', {
      rebootingHint,
      stoppingHint,
      vmStatus: vm.status
    });
  }, [rebootingHint, stoppingHint, vm.vmid, vm.status]);

  // Create a masked VM object for components that need consistent status
  const maskedVM = useMemo(() => {
    // Get pending actions for this VM
    const actionsForVm = pendingActions[vm.vmid] || [];
    const hasRebootPending = actionsForVm.includes('reboot') || rebootingHint;
    const hasStopPending = actionsForVm.includes('stop') || actionsForVm.includes('shutdown') || stoppingHint;
    const hasStartPending = actionsForVm.includes('start');

    let maskedStatus = vm.status;

    // Apply masking logic - during reboot, always show as running
    if (hasRebootPending) {
      maskedStatus = 'running';  // Force running status during reboot
    } else if (hasStopPending && vm.status !== 'stopped') {
      maskedStatus = 'running';  // Keep showing running until actually stopped
    } else if (hasStartPending && vm.status !== 'running') {
      maskedStatus = 'stopped';  // Keep showing stopped until actually running
    }

    console.log('🎭 TableRow VM', vm.vmid, 'masking status:', {
      originalStatus: vm.status,
      maskedStatus,
      hasRebootPending,
      hasStopPending,
      hasStartPending,
      rebootingHint,
      stoppingHint,
      pendingActions: actionsForVm,
      willPassToStatusBadge: maskedStatus,
      willPassToIPAddress: maskedStatus,
      FULL_PENDING_ACTIONS_OBJECT: pendingActions // Show entire pendingActions state
    });

    const result = {
      ...vm,
      status: maskedStatus,
      node
    };

    // Additional logging for StatusBadge props
    console.log('🟢 StatusBadge VM', vm.vmid, 'props:', {
      originalVMStatus: vm.status,
      maskedVMStatus: result.status,
      forcePlay: rebootingHint,
      forceStop: stoppingHint
    });

    return result;
  }, [vm, pendingActions, rebootingHint, stoppingHint, node]);

  const handleApplyWithCooldown = (e: React.MouseEvent<HTMLButtonElement>) => {
    startCooldown();
    applyChanges(e);
  };

  return (
    <>
      {requiresVMStopped && (
        <tr>
          <td colSpan={11} className="bg-yellow-600 text-white text-center py-2 text-xs sm:text-sm">
            <span className="font-medium">
              CPU or RAM changes require the VM to be stopped. Please stop the VM before applying changes.
            </span>
          </td>
        </tr>
      )}

      <tr className={`group bg-gray-800/30 border-b border-white/5 hover:bg-white/5 transition-all duration-200 text-xs sm:text-sm hover:shadow-lg hover:z-10 relative shadow-lg ${colorScheme.shadow}`}>
        <td
          className="px-2 py-4 text-center cursor-pointer text-gray-400 group-hover:text-blue-400 transition-colors"
          onClick={() => toggleRow(vm.vmid)}
        >
          {expandedRows.has(vm.vmid) ? (
            <FiChevronUp className="inline text-lg transform transition-transform" />
          ) : (
            <FiChevronDown className="inline text-lg transform transition-transform" />
          )}
        </td>

        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center font-medium text-blue-300">{vm.vmid}</td>

        <VMNameCell
          {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying: isApplyingOrCooldown }}
        />

        {/* Use masked VM for IP address display */}
        <IPAddressCell vm={maskedVM} />

        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center text-gray-300">{vm.os}</td>

        <CPUCell
          {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying: isApplyingOrCooldown }}
        />

        <RAMCell
          {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying: isApplyingOrCooldown }}
        />

        <HDDCell hdd_sizes={vm.hdd_sizes} />

        <td className="px-2 py-1 text-center">
          <ApplyButton
            onClick={handleApplyWithCooldown}
            hasChanges={hasChanges}
            requiresVMStopped={requiresVMStopped}
            isApplying={isApplyingOrCooldown}
          />
        </td>

        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center narrow-col border-gray-700">
          {/* Use masked status for StatusBadge */}
          <StatusBadge
            status={maskedVM.status}
            resumeShowing={resumeHints.resumeShowing}
            forcePlay={rebootingHint}
            forceStop={stoppingHint}
          />
        </td>

        <ActionButtons
          vm={vm}
          pendingActions={pendingActions}
          vmMutation={vmMutation}
          onToggleRow={() => toggleRow(vm.vmid)}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          queryClient={queryClient}
          isApplying={isApplying} // Pass the local applying state
          onResumeHintsChange={setResumeHints}
          onRebootingHintChange={setRebootingHint}
          onStoppingHintChange={setStoppingHint}
        />
      </tr>

      <ExpandedRow
        vm={vm}
        node={node}
        auth={auth}
        addAlert={addAlert}
        snapshotView={snapshotView}
        expandedRows={expandedRows}
        snapshotMutation={snapshotMutation}
        deleteSnapshotMutation={deleteSnapshotMutation}
        pendingActions={pendingActions}
        snapshots={snapshots}
        snapshotsLoading={snapshotsLoading}
        snapshotsError={snapshotsError}
        refreshVMs={refreshVMs}
      />
    </>
  );
};

export default TableRow;