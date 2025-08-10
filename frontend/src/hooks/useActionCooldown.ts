import { useState, useRef, useEffect } from 'react';

export const useActionCooldown = (minDuration: number) => {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const minTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCooldown = (action: string) => {
    setIsCoolingDown(true);
    setLastAction(action);
    if (minTimerRef.current) clearTimeout(minTimerRef.current);
    minTimerRef.current = setTimeout(() => {
      setIsCoolingDown(false);
      setLastAction(null);
    }, minDuration);
  };

  const clearCooldown = () => {
    if (minTimerRef.current) {
      clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
    setIsCoolingDown(false);
    setLastAction(null);
  };

  useEffect(() => {
    return () => {
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
    };
  }, []);

  return { isCoolingDown, lastAction, triggerCooldown, clearCooldown, minTimerRef };
};