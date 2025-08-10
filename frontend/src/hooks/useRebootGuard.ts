import { useEffect, useState } from 'react';

export function useRebootGuard(
  pendingActions: { [vmid: number]: string[] },
  vmid: number,
  timeoutMs = 30000
) {
  const [ignoreRebootPending, setIgnoreRebootPending] = useState(false);

  useEffect(() => {
    const list = pendingActions[vmid] || [];
    const hasReboot = list.includes('reboot');

    let timer: number | undefined;

    if (hasReboot) {
      if (!ignoreRebootPending) {
        timer = window.setTimeout(() => setIgnoreRebootPending(true), timeoutMs);
      }
    } else if (ignoreRebootPending) {
      setIgnoreRebootPending(false);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [pendingActions, vmid, ignoreRebootPending, timeoutMs]);

  const rawActionsForVm = pendingActions[vmid] || [];
  const actionsForVm = ignoreRebootPending
    ? rawActionsForVm.filter((a) => a !== 'reboot')
    : rawActionsForVm;

  return { actionsForVm, rawActionsForVm };
}
