import { useState, useEffect } from 'react';
import { VM, Auth, TaskStatus } from '../../types';
import { UseMutationResult, QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import ActionButton from './ActionButton';
import CloneButton from './CloneButton';
import ConsoleButton from './ConsoleButton';
import RemoveButton from './RemoveButton';

interface ActionButtonsProps {
  vm: VM;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<
    string,
    any,
    { vmid: number; action: string; name?: string; cpus?: number },
    unknown
  >;
  showSnapshots: (vmid: number) => void;
  onToggleRow: () => void;
  auth: Auth;
  addAlert: (message: string, type: string) => void;
  refreshVMs: () => void;
  queryClient: QueryClient;
  isApplying: boolean;
}

const API_BASE_URL = 'http://localhost:8000';
const PROXMOX_NODE = 'pve';
const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

async function openProxmoxConsole(
  node: string,
  vmid: number,
  csrf_token: string,
  ticket: string
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/vm/${node}/qemu/${vmid}/vncproxy?csrf_token=${encodeURIComponent(
        csrf_token
      )}&ticket=${encodeURIComponent(ticket)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to get VNC proxy data: ${await response.text()}`);
    }
    const { node: respNode, vmid: respVmid } = await response.json();
    const consoleUrl = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/?console=kvm&novnc=1&node=${encodeURIComponent(
      respNode
    )}&vmid=${encodeURIComponent(respVmid)}`;
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    console.error('Error opening Proxmox console:', error);
    toast.error(error.message || 'Failed to open console. Please try again.');
  }
}

const ActionButtons = ({
  vm,
  pendingActions,
  vmMutation,
  onToggleRow,
  auth,
  addAlert,
  refreshVMs,
  queryClient,
  isApplying,
}: ActionButtonsProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isCloningInProgress, setIsCloningInProgress] = useState(false);
  const [cloneName, setCloneName] = useState(vm.name);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((a) => a.startsWith('create-'));
  const isClonePending = pendingActions[vm.vmid]?.includes('clone');
  const showCloningLabel = isCloningInProgress || isClonePending;

  const disableAll =
    hasPendingActions ||
    isStarting ||
    isHalting ||
    isCreatingSnapshot ||
    isCloningInProgress ||
    isRemoving ||
    isApplying;

  const disableConsole =
    !isRebooting && !isStarting && (isCreatingSnapshot || isHalting || hasPendingActions);

  useEffect(() => {
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') setIsHalting(false);
  }, [vm.status, isHalting]);

  const handleConfirmClone = () => {
    setIsCloning(false);
    setIsCloningInProgress(true);
    addAlert(`Cloning process for VM ${vm.name} has started. Target name: "${cloneName}".`, 'info');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
          setIsCloningInProgress(false);
          addAlert(`Cloning of VM "${vm.name}" to "${cloneName}" successfully initiated.`, 'success');
        },
        onError: () => {
          setIsCloningInProgress(false);
          addAlert(`Cloning of VM "${vm.name}" failed.`, 'error');
        },
      }
    );
  };

  const handleCancelClone = () => {
    setIsCloning(false);
    setCloneName(vm.name);
    addAlert(`Clone operation for VM "${vm.name}" was cancelled.`, 'info');
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setShowRemoveConfirm(false);
    addAlert(`Initiating deletion process for VM "${vm.name}"...`, 'warning');

    const previousVms = queryClient.getQueryData<VM[]>(['vms']);
    queryClient.setQueryData<VM[]>(['vms'], (oldVms) =>
      oldVms?.filter((v) => v.vmid !== vm.vmid) || []
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
          auth.csrf_token
        )}&ticket=${encodeURIComponent(auth.ticket)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Failed to initiate VM deletion: ${await response.text()}`);
      }

      let upid = await response.text();
      upid = upid.trim().replace(/^"|"$/g, '');

      let taskStatus: TaskStatus;
      do {
        const taskResponse = await fetch(
          `${API_BASE_URL}/task/${PROXMOX_NODE}/${encodeURIComponent(
            upid
          )}?csrf_token=${encodeURIComponent(auth.csrf_token)}&ticket=${encodeURIComponent(auth.ticket)}`
        );

        if (!taskResponse.ok) {
          throw new Error(`Failed to get task status: ${await taskResponse.text()}`);
        }

        taskStatus = await taskResponse.json();
        if (taskStatus.status !== 'stopped') {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } while (taskStatus.status !== 'stopped');

      if (taskStatus.exitstatus !== 'OK') {
        throw new Error(`Deletion task failed: ${taskStatus.exitstatus}`);
      }

      addAlert(`VM "${vm.name}" has been successfully deleted.`, 'success');
      refreshVMs();
    } catch (error: any) {
      queryClient.setQueryData<VM[]>(['vms'], previousVms);
      addAlert(`Failed to delete VM "${vm.name}": ${error.message}`, 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const removeDisabled =
    isCloning ||
    isCloningInProgress ||
    vm.status === 'running' ||
    vm.status === 'suspended' ||
    disableAll;

  return (
    <td
      className="px-2 py-1 text-center action-buttons-cell"
      style={{
        height: '48px',
        verticalAlign: 'middle',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onToggleRow}
    >
      <div className="flex space-x-2.5 justify-center items-center" style={{ height: '48px' }}>
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsStarting(true);
            addAlert(`Starting VM "${vm.name}"...`, 'info');
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'start', name: vm.name },
              {
                onSuccess: () => addAlert(`VM "${vm.name}" successfully started.`, 'success'),
                onError: () => addAlert(`Failed to start VM "${vm.name}".`, 'error'),
              }
            );
          }}
          disabled={vm.status === 'running' || vm.status === 'suspended' || disableAll}
          className={
            vm.status === 'running' || vm.status === 'suspended' || disableAll
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }
        >
          Start
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            addAlert(`Force stopping VM "${vm.name}"...`, 'warning');
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'stop', name: vm.name },
              {
                onSuccess: () => addAlert(`VM "${vm.name}" was stopped.`, 'success'),
                onError: () => addAlert(`Failed to stop VM "${vm.name}".`, 'error'),
              }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={
            vm.status !== 'running' || disableAll
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }
        >
          Stop
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            addAlert(`Sending shutdown signal to VM "${vm.name}"...`, 'info');
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'shutdown', name: vm.name },
              {
                onSuccess: () => addAlert(`Shutdown initiated for VM "${vm.name}".`, 'success'),
                onError: () => addAlert(`Failed to shutdown VM "${vm.name}".`, 'error'),
              }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={
            vm.status !== 'running' || disableAll
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700'
          }
        >
          Shutdown
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsRebooting(true);
            addAlert(`Rebooting VM "${vm.name}"...`, 'info');
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'reboot', name: vm.name },
              {
                onSuccess: () => addAlert(`VM "${vm.name}" reboot initiated.`, 'success'),
                onError: () => addAlert(`Failed to reboot VM "${vm.name}".`, 'error'),
              }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={
            vm.status !== 'running' || disableAll
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }
        >
          Reboot
        </ActionButton>

        <ConsoleButton
          onClick={(e) => {
            e.stopPropagation();
            openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
          }}
          disabled={disableConsole}
        />

        <CloneButton
          disabled={disableAll}
          showCloningLabel={showCloningLabel}
          isCloning={isCloning}
          cloneName={cloneName}
          onToggle={() => {
            if (!isCloningInProgress) {
              setIsCloning((prev) => {
                const next = !prev;
                if (next) setCloneName(vm.name);
                return next;
              });
            }
          }}
          onChange={setCloneName}
          onConfirm={handleConfirmClone}
          onCancel={handleCancelClone}
        />

        <RemoveButton
          disabled={removeDisabled}
          onConfirm={handleRemove}
          showConfirm={showRemoveConfirm}
          setShowConfirm={setShowRemoveConfirm}
        />
      </div>
    </td>
  );
};

export default ActionButtons;
