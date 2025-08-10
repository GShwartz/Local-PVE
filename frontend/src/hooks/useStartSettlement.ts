import { useEffect } from 'react';
import { MutableRefObject } from 'react';

interface UseStartSettlementParams {
  lastAction: string | null;
  actionsForVm: string[];
  vmStatus: string;
  isStarting: boolean;
  isHalting: boolean;
  minTimerRef: MutableRefObject<NodeJS.Timeout | null>;
  clearCooldown: () => void;
}

export const useStartSettlement = ({
  lastAction,
  actionsForVm,
  vmStatus,
  isStarting,
  isHalting,
  minTimerRef,
  clearCooldown,
}: UseStartSettlementParams) => {
  useEffect(() => {
    // Clear cooldown when the VM reaches the expected state or pending actions are resolved
    if (lastAction === 'start' && vmStatus === 'running' && !isStarting) {
      clearCooldown();
    } else if (
      lastAction === 'stop' &&
      vmStatus === 'stopped' &&
      !isHalting &&
      !actionsForVm.includes('stop')
    ) {
      clearCooldown();
    } else if (
      !actionsForVm.length &&
      !isStarting &&
      !isHalting &&
      vmStatus !== 'suspended'
    ) {
      clearCooldown();
    }
  }, [lastAction, actionsForVm, vmStatus, isStarting, isHalting, clearCooldown]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
    };
  }, [minTimerRef]);
};