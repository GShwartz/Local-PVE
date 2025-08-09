interface Params {
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
}: Params) => {
  const hasPendingActions = actionsForVm.length > 0;
  const isCreatingSnapshot = actionsForVm.some((a) => a.startsWith('create-'));
  const isClonePending = actionsForVm.includes('clone');
  const showCloningLabel = isCloningInProgress || isClonePending;
  const isSuspended = vmStatus === 'paused';

  const hasBlockingPendingForStop = actionsForVm.some((a) => a !== 'resume' && a !== 'suspend');
  const hasBlockingPendingForStart = actionsForVm.some(
    (a) => a !== 'stop' && a !== 'shutdown' && a !== 'resume' && a !== 'suspend'
  );

  const disableAll =
    hasPendingActions ||
    isStarting ||
    isHalting ||
    isCloningInProgress ||
    isRemoving ||
    isApplying ||
    isSuspending ||
    isCoolingDown;

  const disableStop =
    hasBlockingPendingForStop ||
    isStarting ||
    isHalting ||
    isCloningInProgress ||
    isRemoving ||
    isApplying ||
    isSuspending ||
    isCoolingDown;

  // Keep the original nuance: console should not be disabled while actively rebooting.
  const disableConsole =
    isSuspended ||
    isCoolingDown ||
    (!isRebooting && !isStarting && (isCreatingSnapshot || isHalting || hasPendingActions || isSuspending));

  const disableStart =
    hasBlockingPendingForStart ||
    isStarting ||
    isHalting ||
    isCloningInProgress ||
    isRemoving ||
    isApplying ||
    isSuspending ||
    resumeShowing ||
    isCoolingDown;

  const disableShutdown = disableAll || resumeShowing;
  const disableReboot = disableAll || resumeShowing;
  const disableClone = disableAll || resumeShowing;
  const disableRemove = disableAll || resumeShowing || vmStatus === 'running';
  const disableSuspendResume = disableAll;

  return {
    // labels / meta
    showCloningLabel,
    hasBlockingPendingForStop,

    // disables for buttons
    disableAll,
    disableStop,
    disableConsole,
    disableStart,
    disableShutdown,
    disableReboot,
    disableClone,
    disableRemove,
    disableSuspendResume,
  };
};
