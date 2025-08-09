import React, { useState, useEffect, useRef } from 'react';
import { VM, Auth } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

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
  const API_BASE_URL = 'http://localhost:8000';

  // Visual loader under the button (does NOT flip any state on its own)
  const [forceDelay, setForceDelay] = useState(false);
  const guardTimerRef = useRef<number | null>(null);

  // Only treat "suspended" when status says so or while we optimistically wait for suspend to land.
  const isActuallyPaused = vm.status === 'paused';
  const [isOptimisticSuspend, setIsOptimisticSuspend] = useState(false);

  // Keep optimistic flag sane when backend updates land.
  useEffect(() => {
    if (isActuallyPaused) {
      setIsOptimisticSuspend(false);
    }
  }, [isActuallyPaused]);

  // Inject animation keyframes (one-time)
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

  // Button disabled logic (unchanged baseline + loader guard)
  const shouldDisableDueToState = vm.ip_address === 'N/A' && vm.status !== 'running';
  const isButtonDisabled = disabled || isPending || shouldDisableDueToState || forceDelay;

  // Current display state + next action
  const suspendedNow = isActuallyPaused || isOptimisticSuspend;
  const action = suspendedNow ? 'resume' : 'suspend';
  const targetStatus = suspendedNow ? 'running' : 'paused';

  const clearGuard = () => {
    if (guardTimerRef.current) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
  };

  const stopLoader = () => {
    clearGuard();
    setForceDelay(false);
  };

  const handleClick = () => {
    if (isButtonDisabled) return;

    setSuspending(true);
    addAlert(
      `${action === 'suspend' ? 'Suspending' : 'Resuming'} VM "${vm.name}"...`,
      'info'
    );

    // Enter optimistic "suspending" only for suspend clicks
    if (action === 'suspend') setIsOptimisticSuspend(true);

    // Show the loader; auto-stop after 10s if backend is slow
    setForceDelay(true);
    clearGuard();
    guardTimerRef.current = window.setTimeout(() => {
      stopLoader();
      setSuspending(false);
      // keep isOptimisticSuspend as-is; backend refresh will reconcile visual state
    }, 10000);

    vmMutation.mutate(
      { vmid: vm.vmid, action },
      {
        onSuccess: async () => {
          // Poll for the target status briefly so UI doesn't flicker
          const maxRetries = 10;
          const delay = 1000;
          let currentStatus = vm.status;

          try {
            for (let i = 0; i < maxRetries; i++) {
              const response = await fetch(
                `${API_BASE_URL}/vm/${node}/qemu/${vm.vmid}/status?csrf_token=${encodeURIComponent(
                  auth.csrf_token
                )}&ticket=${encodeURIComponent(auth.ticket)}`
              );
              if (!response.ok) break;
              const data = await response.json();
              currentStatus = data.status;
              if (currentStatus === targetStatus) break;
              await new Promise((r) => setTimeout(r, delay));
            }
          } catch {
            // swallow; fall through to finalize
          }

          if (currentStatus === targetStatus) {
            addAlert(`VM "${vm.name}" is now ${targetStatus}.`, 'success');
            refreshVMs();
          }
        },
        onError: () => {
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
          // Revert optimistic suspension if suspend failed
          if (action === 'suspend') setIsOptimisticSuspend(false);
        },
        onSettled: () => {
          stopLoader();
          setSuspending(false);
          // If we resumed, we definitely shouldn't appear suspended anymore
          if (action === 'resume') setIsOptimisticSuspend(false);
        },
      }
    );
  };

  // 🔗 Live hints for StatusBadge and parent controls
  useEffect(() => {
    const resumeShowing = suspendedNow;
    const resumeEnabled = resumeShowing && !isButtonDisabled;
    onHintsChange?.({ resumeShowing, resumeEnabled });
  }, [suspendedNow, isButtonDisabled, onHintsChange]);

  useEffect(() => {
    return () => clearGuard();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        disabled={isButtonDisabled}
        className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 text-white ${
          isButtonDisabled
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
        style={{ height: '34px', lineHeight: '1.5' }}
      >
        {suspendedNow ? 'Resume' : 'Suspend'}
      </button>

      {forceDelay && (
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
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '30%',
              background:
                'linear-gradient(270deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b15cff, #ff6b6b)',
              backgroundSize: '600% 600%',
              borderRadius: '9999px',
              animation:
                'abtn_bar_sweep 1200ms ease-in-out infinite, abtn_bar_gradient 6s ease infinite',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SuspendResumeButton;
