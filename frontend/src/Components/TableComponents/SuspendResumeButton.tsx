import { useState } from 'react';
import ActionButton from './ActionButton';
import { VM } from '../../types';
import { UseMutationResult, useQueryClient } from '@tanstack/react-query';

interface Props {
  vm: VM;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
  disabled: boolean;
}

const suspendedStates = new Set(['paused', 'suspended', 'hibernated']);

const SuspendResumeButton = ({ vm, vmMutation, addAlert, refreshVMs, disabled }: Props) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const isSuspended = suspendedStates.has(vm.status);
  const action = isSuspended ? 'resume' : 'hibernate';
  const label = isSuspended ? 'Resuming' : 'Suspending';
  const buttonText = isSuspended ? 'Resume' : 'Suspend';

  const handleClick = () => {
    setIsProcessing(true);

    addAlert(`${label} VM "${vm.name}"...`, 'info');

    vmMutation.mutate(
      { vmid: vm.vmid, action },
      {
        onSuccess: () => {
          addAlert(`VM "${vm.name}" ${isSuspended ? 'resumed' : 'suspended'}.`, 'success');

          // Optimistically update cached status
          queryClient.setQueryData<VM[]>(['vms'], (oldVms) =>
            oldVms?.map((oldVm) =>
              oldVm.vmid === vm.vmid
                ? { ...oldVm, status: isSuspended ? 'running' : 'paused' }
                : oldVm
            ) || []
          );

          refreshVMs(); // Backend-confirmed state update
        },
        onError: () => {
          addAlert(`Failed to ${action} VM "${vm.name}".`, 'error');
        },
        onSettled: () => {
          setIsProcessing(false);
        },
      }
    );
  };

  const isInactive = (vm.status === 'running' || isSuspended) && (disabled || isProcessing);

  const buttonColor =
    isSuspended ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700';

  return (
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      disabled={isInactive}
      className={isInactive ? 'bg-gray-600 cursor-not-allowed' : buttonColor}
    >
      {buttonText}
    </ActionButton>
  );
};

export default SuspendResumeButton;
