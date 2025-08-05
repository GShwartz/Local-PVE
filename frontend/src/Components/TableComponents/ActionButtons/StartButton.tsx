import ActionButton from './ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface StartButtonProps {
  vm: VM;
  disabled: boolean;
  isStarting: boolean;
  setIsStarting: React.Dispatch<React.SetStateAction<boolean>>;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;
}

const StartButton = ({
  vm,
  disabled,
  setIsStarting,
  vmMutation,
  addAlert,
}: StartButtonProps) => {
  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarting(true);
    addAlert(`Starting VM "${vm.name}"...`, 'info');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'start', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" successfully started.`, 'success'),
        onError: () => addAlert(`Failed to start VM "${vm.name}".`, 'error'),
      }
    );
  };

  const isInactive = vm.status === 'running' || vm.status === 'suspended' || disabled;

  return (
    <ActionButton
      onClick={handleStart}
      disabled={isInactive}
      className={isInactive ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Start
    </ActionButton>
  );
};

export default StartButton;
