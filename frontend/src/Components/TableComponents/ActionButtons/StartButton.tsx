import ActionButton from './ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface StartButtonProps {
  vm: VM;
  disabled: boolean;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;
  onSent?: () => void;
}

const StartButton = ({
  vm,
  disabled,
  vmMutation,
  addAlert,
  onSent,
}: StartButtonProps) => {
  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addAlert(`Starting VM "${vm.name}"...`, 'info');

    // Inform parent so it can add 'start' to activeOperations
    onSent?.();

    // Send the action
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'start', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" successfully started.`, 'success'),
        onError: () => addAlert(`Failed to start VM "${vm.name}".`, 'error'),
      }
    );
  };

  return (
    <ActionButton
      onClick={handleStart}
      disabled={disabled}
      className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Start
    </ActionButton>
  );
};

export default StartButton;