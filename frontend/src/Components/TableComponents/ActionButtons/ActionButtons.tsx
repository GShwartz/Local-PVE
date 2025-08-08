import { useEffect, useRef, useState } from 'react';
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
  loaderMinDuration?: number;
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
  loaderMinDuration = 5000,
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
  const [resumeShowing, setResumeShowing] = useState(false);

  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [lastAction, setLastAction] = useState<null | 'start'>(null);
  const cooldownTimer = useRef<number | null>(null);

  const [minElapsed, setMinElapsed] = useState(false);
  const [settled, setSettled] = useState(false);
  const minTimer = useRef<number | null>(null);
  const maxGuardTimer = useRef<number | null>(null);

  // add gradient animation keyframes
  const styleInjectedRef = useRef(false);
  useEffect(() => {
    if (styleInjectedRef.current) return;
    const styleTag = document.createElement('style');
    styleTag.type = 'text/css';
    styleTag.textContent = `
      @keyframes abtn_bar_sweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }
      @keyframes abtn_bar_gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(styleTag);
    styleInjectedRef.current = true;
  }, []);

  const clearTimers = () => {
    if (cooldownTimer.current) {
      window.clearTimeout(cooldownTimer.current);
      cooldownTimer.current = null;
    }
    if (minTimer.current) {
      window.clearTimeout(minTimer.current);
      minTimer.current = null;
    }
    if (maxGuardTimer.current) {
      window.clearTimeout(maxGuardTimer.current);
      maxGuardTimer.current = null;
    }
  };

  const clearCooldown = () => {
    clearTimers();
    setIsCoolingDown(false);
    setLastAction(null);
    setMinElapsed(false);
    setSettled(false);
  };

  const triggerCooldown = (action: 'start') => {
    setLastAction(action);
    setIsCoolingDown(true);
    setMinElapsed(false);
    setSettled(false);

    clearTimers();
    minTimer.current = window.setTimeout(() => setMinElapsed(true), loaderMinDuration);
    maxGuardTimer.current = window.setTimeout(() => {
      setMinElapsed(true);
      setSettled(true);
    }, 30000);
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const actionsForVm = pendingActions[vm.vmid] || [];
  const hasPendingActions = actionsForVm.length > 0;
  const isCreatingSnapshot = actionsForVm.some((a) => a.startsWith('create-'));
  const isClonePending = actionsForVm.includes('clone');
  const showCloningLabel = isCloningInProgress || isClonePending;
  const isSuspended = vm.status === 'paused';

  const disableAll =
    hasPendingActions || isStarting || isHalting || isCloningInProgress || isRemoving || isApplying || isSuspending;

  const hasBlockingPendingForStop = actionsForVm.some((a) => a !== 'resume' && a !== 'suspend');
  const disableStop = hasBlockingPendingForStop || isStarting || isHalting || isCloningInProgress || isRemoving || isApplying || isSuspending;

  const disableConsole =
    isSuspended || (!isRebooting && !isStarting && (isCreatingSnapshot || isHalting || hasPendingActions || isSuspending));

  const hasBlockingPendingForStart = actionsForVm.some((a) => a !== 'stop' && a !== 'shutdown' && a !== 'resume' && a !== 'suspend');
  const disableStart =
    hasBlockingPendingForStart || isStarting || isHalting || isCloningInProgress || isRemoving || isApplying || isSuspending || resumeShowing;

  useEffect(() => {
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') {
      setIsHalting(false);
    }
  }, [vm.status, isHalting]);

  useEffect(() => {
    if (lastAction !== 'start') return;
    const startStillPending = actionsForVm.includes('start');
    const nowSettled = vm.status === 'running' || (!isStarting && !startStillPending);
    setSettled(nowSettled);
  }, [lastAction, vm.status, isStarting, actionsForVm]);

  useEffect(() => {
    if (lastAction === 'start' && isCoolingDown && minElapsed && settled) {
      clearCooldown();
    }
  }, [lastAction, isCoolingDown, minElapsed, settled]);

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
    queryClient.setQueryData<VM[]>(['vms'], (oldVms) => oldVms?.filter((v) => v.vmid !== vm.vmid) || []);

    try {
      const response = await fetch(
        `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
          auth.csrf_token
        )}&ticket=${encodeURIComponent(auth.ticket)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error(`Failed to initiate VM deletion: ${await response.text()}`);

      let upid = await response.text();
      upid = upid.trim().replace(/^"|"$/g, '');

      let taskStatus: TaskStatus;
      do {
        const taskResponse = await fetch(
          `${API_BASE_URL}/task/${PROXMOX_NODE}/${encodeURIComponent(
            upid
          )}?csrf_token=${encodeURIComponent(auth.csrf_token)}&ticket=${encodeURIComponent(auth.ticket)}`
        );
        if (!taskResponse.ok) throw new Error(`Failed to get task status: ${await taskResponse.text()}`);

        taskStatus = await taskResponse.json();
        if (taskStatus.status !== 'stopped') await new Promise((resolve) => setTimeout(resolve, 500));
      } while (taskStatus.status !== 'stopped');

      if (taskStatus.exitstatus !== 'OK') throw new Error(`Deletion task failed: ${taskStatus.exitstatus}`);

      addAlert(`VM "${vm.name}" has been successfully deleted.`, 'success');
      refreshVMs();
    } catch (error: any) {
      queryClient.setQueryData<VM[]>(['vms'], previousVms);
      addAlert(`Failed to delete VM "${vm.name}": ${error.message}`, 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const vmMutationPassthrough = vmMutation;

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
        <div className={styles.buttonGroup} style={{ height: '48px' }}>
          <StartButton vm={vm} disabled={disableStart} isStarting={isStarting} setIsStarting={setIsStarting} vmMutation={vmMutationPassthrough} addAlert={addAlert} onSent={() => triggerCooldown('start')} />
          <StopButton vm={vm} disabled={disableStop} setIsHalting={setIsHalting} vmMutation={vmMutationPassthrough} addAlert={addAlert} />
          <ShutdownButton vm={vm} disabled={disableAll || resumeShowing} setIsHalting={setIsHalting} vmMutation={vmMutationPassthrough} addAlert={addAlert} />
          <RebootButton vm={vm} disabled={disableAll || resumeShowing} setIsRebooting={setIsRebooting} vmMutation={vmMutationPassthrough} addAlert={addAlert} />
          <SuspendResumeButton vm={vm} node={PROXMOX_NODE} auth={auth} vmMutation={vmMutationPassthrough} addAlert={addAlert} refreshVMs={refreshVMs} disabled={disableAll} isPending={actionsForVm.some((a) => a === 'suspend' || a === 'resume')} setSuspending={setIsSuspending} onHintsChange={(hints) => { setResumeShowing(hints.resumeShowing); onResumeHintsChange?.(hints); }} />
          <ConsoleButton onClick={(e) => { e.stopPropagation(); openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket); }} disabled={disableConsole || resumeShowing} />
          <CloneButton disabled={disableAll || resumeShowing} showCloningLabel={showCloningLabel} isCloning={isCloning} cloneName={cloneName} onToggle={() => { if (!isCloningInProgress) { setIsCloning((prev) => { const next = !prev; if (next) setCloneName(vm.name); return next; }); } }} onChange={setCloneName} onConfirm={handleConfirmClone} onCancel={handleCancelClone} />
          <RemoveButton disabled={disableAll || resumeShowing || vm.status === 'running'} onConfirm={handleRemove} showConfirm={showRemoveConfirm} setShowConfirm={setShowRemoveConfirm} />
        </div>

        {isCoolingDown && lastAction === 'start' && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '6px',
              marginTop: '8px',
              borderRadius: '9999px',
              background: 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: '30%',
                background: 'linear-gradient(270deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b15cff, #ff6b6b)',
                backgroundSize: '600% 600%',
                borderRadius: '9999px',
                animation: 'abtn_bar_sweep 1200ms ease-in-out infinite, abtn_bar_gradient 6s ease infinite',
              }}
            />
          </div>
        )}
      </div>
    </td>
  );
};

export default ActionButtons;
