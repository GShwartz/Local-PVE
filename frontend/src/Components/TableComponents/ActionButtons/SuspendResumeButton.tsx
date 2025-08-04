import React, { useState } from 'react';
import { VM, Auth } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface SuspendResumeButtonProps {
  vm: VM;
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
}

const SuspendResumeButton: React.FC<SuspendResumeButtonProps> = ({
  vm,
  auth,
  vmMutation,
  addAlert,
  refreshVMs,
  disabled
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const API_BASE_URL = 'http://localhost:8000';

  const isSuspended = vm.status === 'paused' || vm.ip_address === 'N/A';
  const action = isSuspended ? 'resume' : 'hibernate';
  const targetStatus = isSuspended ? 'running' : 'paused';

  const handleClick = () => {
    if (disabled || isToggling) return;

    setIsToggling(true);
    addAlert(`${action === 'hibernate' ? 'Suspending' : 'Resuming'} VM "${vm.name}"...`, 'info');

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
                `${API_BASE_URL}/vm/pve/qemu/${vm.vmid}/status?csrf_token=${encodeURIComponent(
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
          } else {
            addAlert(`VM "${vm.name}" did not reach ${targetStatus} state.`, 'error');
          }
        },
        onError: () => {
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
        },
        onSettled: () => setIsToggling(false),
      }
    );
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      disabled={disabled || isToggling}
      className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 text-white ${
        disabled || isToggling
          ? 'bg-gray-600 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      style={{ height: '34px', lineHeight: '1.5' }}
    >
      {isSuspended ? 'Resume' : 'Suspend'}
    </button>
  );
};

export default SuspendResumeButton;
