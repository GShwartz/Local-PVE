import { useEffect, useRef, useState } from 'react';

export const useStartCooldown = (loaderMinDuration: number) => {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [lastAction, setLastAction] = useState<null | 'start'>(null);
  const minTimerRef = useRef<number | null>(null);
  const maxGuardTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (minTimerRef.current) {
      window.clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
    if (maxGuardTimerRef.current) {
      window.clearTimeout(maxGuardTimerRef.current);
      maxGuardTimerRef.current = null;
    }
  };

  const clearCooldown = () => {
    clearTimers();
    setIsCoolingDown(false);
    setLastAction(null);
  };

  const triggerCooldown = (action: 'start') => {
    setLastAction(action);
    setIsCoolingDown(true);

    clearTimers();
    // keep the loader visible for at least loaderMinDuration
    minTimerRef.current = window.setTimeout(() => {
      /* no-op: enforcement only */
    }, loaderMinDuration);

    // hard guard to auto-clear even if backend never settles
    maxGuardTimerRef.current = window.setTimeout(() => {
      clearCooldown();
    }, 30000);
  };

  useEffect(() => () => clearTimers(), []);

  return { isCoolingDown, lastAction, triggerCooldown, clearCooldown, minTimerRef };
};
