import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import { VM, Auth } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';
import ActionButton from './ActionButton';

interface SuspendResumeButtonProps {
  vm: VM;
  node: string;
  auth: Auth;
  vmMutation: UseMutationResult<
    string,
    any,
    { vmid: number; action: string; name?: string },
    unknown
  >;
  addAlert: (message: string, type: string) => void;
  refreshVMs: () => void;
  disabled: boolean;
  isPending: boolean;
  setSuspending: (state: boolean) => void;
  onHintsChange?: (hints: { resumeShowing: boolean; resumeEnabled: boolean }) => void;
}

const SuspendResumeButton: React.FC<SuspendResumeButtonProps> = ({
  vm,
  node,
  auth,
  vmMutation,
  addAlert,
  refreshVMs,
  disabled,
  isPending,
  setSuspending,
  onHintsChange,
}) => {
  const [forceDelay, setForceDelay] = useState(false);
  const [localSuspended, setLocalSuspended] = useState(
    vm.status === 'paused' || (vm.status === 'running' && vm.ip_address === 'N/A')
  );
  const API_BASE_URL = 'http://localhost:8000';

  // Use ref to track the last sent hints to prevent unnecessary calls
  const lastHintsRef = useRef<{ resumeShowing: boolean; resumeEnabled: boolean } | null>(null);

  const shouldDisableDueToState =
    vm.ip_address === 'N/A' && vm.status !== 'running';

  const isButtonDisabled =
    disabled || isPending || shouldDisableDueToState || forceDelay;

  const action = localSuspended ? 'resume' : 'suspend';
  const targetStatus = localSuspended ? 'running' : 'paused';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isButtonDisabled) return;

    setSuspending(true);
    addAlert(
      `${action === 'suspend' ? 'Suspending' : 'Resuming'} VM "${vm.name}"...`,
      'info'
    );

    vmMutation.mutate(
      { vmid: vm.vmid, action },
      {
        onSuccess: async () => {
          const maxRetries = 10;
          const delay = 1000;
          let currentStatus = vm.status;

          for (let i = 0; i < maxRetries; i++) {
            try {
              const response = await fetch(
                `${API_BASE_URL}/vm/${node}/qemu/${vm.vmid}/status?csrf_token=${encodeURIComponent(
                  auth.csrf_token
                )}&ticket=${encodeURIComponent(auth.ticket)}`
              );
              if (!response.ok) break;
              const data = await response.json();
              currentStatus = data.status;
              if (currentStatus === targetStatus) break;
            } catch {
              break;
            }
            await new Promise((r) => setTimeout(r, delay));
          }

          if (currentStatus === targetStatus) {
            addAlert(`VM "${vm.name}" is now ${targetStatus}.`, 'success');
            refreshVMs();
          }
        },
        onError: () => {
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
        },
      }
    );

    setForceDelay(true);
    setTimeout(() => {
      setLocalSuspended((prev) => !prev);
      setForceDelay(false);
      setSuspending(false);
    }, 10000);
  };

  // Memoized hint calculation to prevent unnecessary re-renders
  const calculateHints = useCallback(() => {
    const resumeShowing = localSuspended;
    const resumeEnabled = resumeShowing && !isButtonDisabled;
    return { resumeShowing, resumeEnabled };
  }, [localSuspended, isButtonDisabled]);

  // 🔗 Send live hints to parent for StatusBadge - but only when they actually change
  useEffect(() => {
    const newHints = calculateHints();

    // Only call onHintsChange if the hints actually changed
    if (!lastHintsRef.current ||
      lastHintsRef.current.resumeShowing !== newHints.resumeShowing ||
      lastHintsRef.current.resumeEnabled !== newHints.resumeEnabled) {

      lastHintsRef.current = newHints;
      onHintsChange?.(newHints);
    }
  }, [calculateHints]);

  return (
    <ActionButton
      onClick={handleClick}
      disabled={isButtonDisabled}
      variant={localSuspended ? 'green' : 'yellow'}
    >
      {localSuspended ? <><FiPlay size={14} /> Resume</> : <><FiPause size={14} /> Suspend</>}
    </ActionButton>
  );
};

export default SuspendResumeButton;