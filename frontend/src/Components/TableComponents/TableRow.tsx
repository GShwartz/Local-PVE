import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useQuery, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
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

interface TableRowProps {
  vm: VM;
  expandedRows: Set<number>;
  toggleRow: (vmid: number) => void;
  snapshotView: Set<number>;
  showSnapshots: (vmid: number) => void;
  openModal: (vmid: number, vmName: string) => void;
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
  setTableApplying: (isApplying: boolean) => void;
  refreshVMs: () => void;
  openConsole: (vmid: number) => void;
  hasRowAboveExpanded: boolean;
  isApplying: boolean;
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
  isApplying,
  loaderMinDuration,
}: TableRowProps) => {
  const queryClient = useQueryClient();

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
    setTableApplying,
    addAlert,
  });

  const vmWithNode: VM = { ...vm, node };

  // 🔗 Real-time hints from the actual Resume button (coming from ActionButtons)
  const [resumeHints, setResumeHints] = useState<{ resumeShowing: boolean; resumeEnabled: boolean }>({
    resumeShowing: false,
    resumeEnabled: false,
  });

  // Start is disabled whenever VM isn't stopped (matches your UI)
  const startDisabled = vm.status !== 'stopped';

  // Displayed IP string exactly as the IP cell gets it
  const ipAddress = vm.ip_address || 'N/A';

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

      <tr className="bg-gray-900 border-b border-gray-700 hover:bg-gray-700 text-xs sm:text-sm">
        <td
          className="px-2 py-8 text-center cursor-pointer"
          onClick={() => toggleRow(vm.vmid)}
        >
          {expandedRows.has(vm.vmid) ? (
            <FiChevronUp className="inline text-lg" />
          ) : (
            <FiChevronDown className="inline text-lg" />
          )}
        </td>

        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">{vm.vmid}</td>

        <VMNameCell
          {...{ vm, editingVmid, openEditModal, cancelEdit, setChangesToApply, isApplying: isApplyingOrCooldown }}
        />

        <IPAddressCell vm={vmWithNode} />

        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">{vm.os}</td>

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
          <StatusBadge
            status={vm.status}
            resumeShowing={resumeHints.resumeShowing}
            resumeEnabled={resumeHints.resumeEnabled}
            startDisabled={startDisabled}
            ipAddress={ipAddress}
          />
        </td>

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
          isApplying={isApplyingOrCooldown}
          onResumeHintsChange={setResumeHints}
        />
      </tr>

      <ExpandedRow
        vm={vm}
        node={node}
        auth={auth}
        addAlert={addAlert}
        snapshotView={snapshotView}
        expandedRows={expandedRows}
        openModal={openModal}
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
