import { useMemo } from 'react';

interface PendingDerivedProps {
  actionsForVm: string[];
  vmStatus: string;
  isStarting: boolean;
  isHalting: boolean;
  isCloningInProgress: boolean;
  isRemoving: boolean;
  isApplying: boolean;
  isSuspending: boolean;
  isCoolingDown: boolean;
  resumeShowing: boolean;
  isRebooting: boolean;
  hasIp?: boolean;
  ignoreStatusMismatch?: boolean;
}

export const usePendingDerived = ({
  actionsForVm,
  vmStatus,
  isStarting,
  isHalting,
  isCloningInProgress,
  isRemoving,
  isApplying,
  isSuspending,
  isCoolingDown,
  resumeShowing,
  isRebooting,
  hasIp,
  ignoreStatusMismatch,
}: PendingDerivedProps) => {
  return useMemo(() => {
    const hasBlockingPendingForStop = actionsForVm.some((a) =>
      ['stop', 'shutdown'].includes(a)
    );
    const hasBlockingPendingForStart = actionsForVm.some((a) =>
      ['start', 'reboot'].includes(a)
    );
    const hasBlockingPendingForReboot = actionsForVm.includes('reboot');
    const hasBlockingPendingForClone = actionsForVm.includes('clone');
    const hasBlockingPendingForRemove = actionsForVm.includes('remove');
    const hasBlockingPendingForSuspendResume = actionsForVm.some((a) =>
      ['suspend', 'resume'].includes(a)
    );

    const status = (vmStatus || '').toLowerCase();
    const isPausedLike =
      status === 'paused' || status === 'suspended' || status === 'hibernate';

    const stopAllowedStatuses = ['running', 'paused', 'hibernate', 'suspended'];

    // Treat reboot like powered for power controls; console stays usable during reboot
    const poweredOrRebooting = status === 'running' || isRebooting;

    const disableStop =
      !stopAllowedStatuses.includes(status) ||
      hasBlockingPendingForStop ||
      isStarting ||
      isHalting ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      isCoolingDown ||
      isRebooting;

    const disableStart =
      status !== 'stopped' ||
      hasBlockingPendingForStart ||
      isStarting ||
      isHalting ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      isCoolingDown ||
      isRebooting;

    const disableShutdown =
      status !== 'running' ||
      isHalting ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      isRebooting;

    const disableReboot =
      status !== 'running' ||
      isRebooting ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      hasBlockingPendingForReboot;

    // Clone: disable when paused/resumeShowing; while stop/shutdown/reboot pending or local; and while starting (powering up)
    const disableClone =
      hasBlockingPendingForClone ||
      isPausedLike ||
      resumeShowing ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      hasBlockingPendingForStop ||
      hasBlockingPendingForReboot ||
      hasBlockingPendingForStart || // queued start = powering up soon
      isHalting ||
      isRebooting ||
      isStarting; // local start in progress = powering up now

    // Remove disabled when powered (or rebooting), starting, or blocking
    const appearsPowered = poweredOrRebooting || !!hasIp;
    const disableRemove =
      hasBlockingPendingForRemove ||
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      appearsPowered ||
      isStarting;

    let disableSuspendResume: boolean;
    if (isPausedLike || resumeShowing) {
      disableSuspendResume =
        hasBlockingPendingForSuspendResume || isSuspending;
    } else {
      disableSuspendResume =
        hasBlockingPendingForSuspendResume ||
        isSuspending ||
        isCloningInProgress ||
        isRemoving ||
        isApplying ||
        isCoolingDown ||
        isRebooting;
    }

    // Console usable during reboot; keep existing blockers only
    const disableConsole =
      isCloningInProgress ||
      isRemoving ||
      isApplying ||
      isSuspending ||
      isCoolingDown ||
      resumeShowing;

    const showCloningLabel = hasBlockingPendingForClone;

    return {
      showCloningLabel,
      disableStop,
      disableConsole,
      disableStart,
      disableShutdown,
      disableReboot,
      disableClone,
      disableRemove,
      disableSuspendResume,
    };
  }, [
    actionsForVm,
    vmStatus,
    isStarting,
    isHalting,
    isCloningInProgress,
    isRemoving,
    isApplying,
    isSuspending,
    isCoolingDown,
    resumeShowing,
    isRebooting,
    hasIp,
    ignoreStatusMismatch,
  ]);
};
