import { useState, useEffect } from 'react';
import { VM, Auth, TaskStatus } from '../../../types';
import { UseMutationResult, QueryClient } from '@tanstack/react-query';

import StartButton from './StartButton';
import StopButton from './StopButton';
import ShutdownButton from './ShutdownButton';
import RebootButton from './RebootButton';
import ConsoleButton from './ConsoleButton';
import CloneButton from './CloneButton';
import RemoveButton from './RemoveButton';
import SuspendResumeButton from './SuspendResumeButton';
import { openProxmoxConsole } from './openProxmoxConsole';
import styles from '../../../CSS/ActionButtons.module.css';

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
  onResumeHintsChange?: (hints: { resumeShowing: boolean; resumeEnabled: boolean }) => void;
}

const PROXMOX_NODE = 'pve';
const API_BASE_URL = 'http://localhost:8000';

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
  onResumeHintsChange,
}: ActionButtonsProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isCloningInProgress, setIsCloningInProgress] = useState(false);
  const [cloneName, setCloneName] = useState(vm.name);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);

  // Track if Resume button is showing
  const [resumeShowing, setResumeShowing] = useState(false);

  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((a) => a.startsWith('create-'));
  const isClonePending = pendingActions[vm.vmid]?.includes('clone');
  const showCloningLabel = isCloningInProgress || isClonePending;

  const isSuspended = vm.status === 'paused';

  const disableAll =
    hasPendingActions ||
    isStarting ||
    isHalting ||
    isCloningInProgress ||
    isRemoving ||
    isApplying ||
    isSuspending;

  const disableConsole =
    isSuspended || (!isRebooting && !isStarting && (isCreatingSnapshot || isHalting || hasPendingActions || isSuspending));

  useEffect(() => {
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') {
      setIsHalting(false);
    }
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
      <div className={styles.buttonGroup} style={{ height: '48px' }}>
        <StartButton
          vm={vm}
          disabled={disableAll || resumeShowing}
          isStarting={isStarting}
          setIsStarting={setIsStarting}
          vmMutation={vmMutation}
          addAlert={addAlert}
        />
        <StopButton
          vm={vm}
          disabled={disableAll || resumeShowing}
          setIsHalting={setIsHalting}
          vmMutation={vmMutation}
          addAlert={addAlert}
        />
        <ShutdownButton
          vm={vm}
          disabled={disableAll || resumeShowing}
          setIsHalting={setIsHalting}
          vmMutation={vmMutation}
          addAlert={addAlert}
        />
        <RebootButton
          vm={vm}
          disabled={disableAll || resumeShowing}
          setIsRebooting={setIsRebooting}
          vmMutation={vmMutation}
          addAlert={addAlert}
        />
        <SuspendResumeButton
          vm={vm}
          node={PROXMOX_NODE}
          auth={auth}
          vmMutation={vmMutation}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          disabled={disableAll}
          isPending={pendingActions[vm.vmid]?.some((a) => a === 'suspend' || a === 'resume')}
          setSuspending={setIsSuspending}
          onHintsChange={(hints) => {
            setResumeShowing(hints.resumeShowing);
            onResumeHintsChange?.(hints);
          }}
        />
        <ConsoleButton
          onClick={(e) => {
            e.stopPropagation();
            openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
          }}
          disabled={disableConsole || resumeShowing}
        />
        <CloneButton
          disabled={disableAll || resumeShowing}
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
          disabled={disableAll || resumeShowing || vm.status === 'running'}
          onConfirm={handleRemove}
          showConfirm={showRemoveConfirm}
          setShowConfirm={setShowRemoveConfirm}
        />
      </div>
    </td>
  );
};

export default ActionButtons;
