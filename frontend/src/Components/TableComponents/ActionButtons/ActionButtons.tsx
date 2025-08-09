import { useEffect, useState } from 'react';
import { VM, Auth } from '../../../types';
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

// 🔹 Hooks (logic-only)
import { useGradientKeyframes } from '../../../hooks/useGradientKeyframes';
import { useStartCooldown } from '../../../hooks/useStartCooldown';
import { useStartSettlement } from '../../../hooks/useStartSettlement';
import { usePendingDerived } from '../../../hooks/usePendingDerived';
import { useCloneHandlers } from '../../../hooks/useCloneHandlers';
import { useRemoveVM } from '../../../hooks/useRemoveVM';
import { useRebootGuard } from '../../../hooks/useRebootGuard';

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

  useGradientKeyframes();

  const { isCoolingDown, lastAction, triggerCooldown, clearCooldown, minTimerRef } =
    useStartCooldown(loaderMinDuration);

  // Reboot pending guard (logic-only)
  const { actionsForVm, rawActionsForVm } = useRebootGuard(pendingActions, vm.vmid, 30000);

  const {
    showCloningLabel,
    disableStop,
    disableConsole,
    disableStart,
    disableShutdown,
    disableReboot,
    disableClone,
    disableRemove,
    disableSuspendResume,
  } = usePendingDerived({
    actionsForVm,
    vmStatus: vm.status,
    isStarting,
    isHalting,
    isCloningInProgress,
    isRemoving,
    isApplying,
    isSuspending,
    isCoolingDown,
    resumeShowing,
    isRebooting,
  });

  useEffect(() => {
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') setIsHalting(false);
  }, [vm.status, isHalting]);

  // safety: if backend clears "reboot" from pending, ensure we drop isRebooting
  useEffect(() => {
    if (isRebooting && !rawActionsForVm.includes('reboot')) setIsRebooting(false);
  }, [isRebooting, rawActionsForVm]);

  useStartSettlement({
    lastAction,
    actionsForVm,
    vmStatus: vm.status,
    isStarting,
    minTimerRef,
    clearCooldown,
  });

  const { handleConfirmClone, handleCancelClone } = useCloneHandlers({
    vm,
    setIsCloning,
    setIsCloningInProgress,
    addAlert,
    vmMutation,
    cloneName,
  });

  const handleRemove = useRemoveVM({
    vm,
    auth,
    addAlert,
    refreshVMs,
    queryClient,
    setIsRemoving,
    API_BASE_URL: 'http://localhost:8000',
    PROXMOX_NODE: 'pve',
    setShowRemoveConfirm,
  });

  return (
    <td
      className="px-2 py-1 text-center action-buttons-cell"
      style={{
        height: '34px',
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
          <StartButton
            vm={vm}
            disabled={disableStart}
            isStarting={isStarting}
            setIsStarting={setIsStarting}
            vmMutation={vmMutation}
            addAlert={addAlert}
            onSent={() => triggerCooldown('start')}
          />
          <StopButton
            vm={vm}
            disabled={disableStop}
            setIsHalting={setIsHalting}
            vmMutation={vmMutation}
            addAlert={addAlert}
          />
          <ShutdownButton
            vm={vm}
            disabled={disableShutdown}
            setIsHalting={setIsHalting}
            vmMutation={vmMutation}
            addAlert={addAlert}
          />
          <RebootButton
            vm={vm}
            disabled={disableReboot}
            setIsRebooting={setIsRebooting}
            vmMutation={vmMutation}
            addAlert={addAlert}
          />
          <SuspendResumeButton
            vm={vm}
            node={'pve'}
            auth={auth}
            vmMutation={vmMutation}
            addAlert={addAlert}
            refreshVMs={refreshVMs}
            disabled={disableSuspendResume}
            isPending={rawActionsForVm.some((a) => a === 'suspend' || a === 'resume')}
            setSuspending={setIsSuspending}
            onHintsChange={(hints) => {
              setResumeShowing(hints.resumeShowing);
              onResumeHintsChange?.(hints);
            }}
          />
          <ConsoleButton
            onClick={(e) => {
              e.stopPropagation();
              openProxmoxConsole('pve', vm.vmid, auth.csrf_token, auth.ticket);
            }}
            disabled={disableConsole || resumeShowing}
          />
          <CloneButton
            disabled={disableClone}
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
            disabled={disableRemove}
            onConfirm={handleRemove}
            showConfirm={showRemoveConfirm}
            setShowConfirm={setShowRemoveConfirm}
          />
        </div>

        {isCoolingDown && lastAction === 'start' && (
          <div
            aria-live="polite"
            style={{
              width: '100%',
              height: '6px',
              marginTop: 'px',
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
