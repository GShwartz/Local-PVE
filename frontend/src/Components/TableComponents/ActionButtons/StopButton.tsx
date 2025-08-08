import ActionButton from './ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface StopButtonProps {
  vm: VM;
  disabled: boolean;
  setIsHalting: React.Dispatch<React.SetStateAction<boolean>>;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;
}

const StopButton = ({
  vm,
  disabled,
  setIsHalting,
  vmMutation,
  addAlert,
}: StopButtonProps) => {
  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHalting(true);
    addAlert(`Force stopping VM "${vm.name}"...`, 'warning');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'stop', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" was stopped.`, 'success'),
        onError: () => addAlert(`Failed to stop VM "${vm.name}".`, 'error'),
      }
    );
  };

  const normalizedStatus = (vm.status || '').trim().toLowerCase();
  // Allow Stop when VM is running OR paused/hibernate/suspended (when Resume would show)
  const canStop =
    normalizedStatus === 'running' ||
    normalizedStatus === 'paused' ||
    normalizedStatus === 'hibernate' ||
    normalizedStatus === 'suspended';

  const isInactive = disabled || !canStop;

  return (
    <ActionButton
      onClick={handleStop}
      disabled={isInactive}
      className={isInactive ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Stop
    </ActionButton>
  );
};

export default StopButton;
