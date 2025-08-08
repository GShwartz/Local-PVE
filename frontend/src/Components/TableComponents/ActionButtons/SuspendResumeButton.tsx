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
  const [forceDelay, setForceDelay] = useState(false);
  const [localSuspended, setLocalSuspended] = useState(
    vm.status === 'paused' || (vm.status === 'running' && vm.ip_address === 'N/A')
  );
  const API_BASE_URL = 'http://localhost:8000';

  // Keep localSuspended in sync with real VM state so parent hints are accurate.
  useEffect(() => {
    const shouldBeSuspended =
      vm.status === 'paused' || (vm.status === 'running' && vm.ip_address === 'N/A');
    setLocalSuspended(shouldBeSuspended);
  }, [vm.status, vm.ip_address]);

  // inject animation keyframes
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

  const shouldDisableDueToState =
    vm.ip_address === 'N/A' && vm.status !== 'running';

  const isButtonDisabled =
    disabled || isPending || shouldDisableDueToState || forceDelay;

  const action = localSuspended ? 'resume' : 'suspend';
  const targetStatus = localSuspended ? 'running' : 'paused';

  const handleClick = () => {
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

  // 🔗 Send live hints to parent for StatusBadge
  useEffect(() => {
    const resumeShowing = localSuspended;
    const resumeEnabled = resumeShowing && !isButtonDisabled;
    onHintsChange?.({ resumeShowing, resumeEnabled });
  }, [localSuspended, isButtonDisabled, onHintsChange]);

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
        {localSuspended ? 'Resume' : 'Suspend'}
      </button>

      {/* Loader bar spans full group width */}
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
            flexShrink: 0
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
