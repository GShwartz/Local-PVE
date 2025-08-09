import { MutableRefObject, useEffect } from 'react';

interface Params {
  lastAction: 'start' | null;
  actionsForVm: string[];
  vmStatus: string;
  isStarting: boolean;
  minTimerRef: MutableRefObject<number | null>;
  clearCooldown: () => void;
}

export const useStartSettlement = ({
  lastAction,
  actionsForVm,
  vmStatus,
  isStarting,
  minTimerRef,
  clearCooldown,
}: Params) => {
  useEffect(() => {
    if (lastAction !== 'start') return;

    const startStillPending = actionsForVm.includes('start');
    const nowSettled = vmStatus === 'running' || (!isStarting && !startStillPending);

    if (nowSettled) {
      // respect minimum visibility — defer clear until the min timer has elapsed
      if (minTimerRef.current == null) {
        clearCooldown();
      } else {
        const t = window.setTimeout(() => {
          clearCooldown();
          window.clearTimeout(t);
        }, 0);
      }
    }
  }, [lastAction, actionsForVm, vmStatus, isStarting, minTimerRef, clearCooldown]);
};
