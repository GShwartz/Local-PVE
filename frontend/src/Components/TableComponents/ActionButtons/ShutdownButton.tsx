import ActionButton from '../ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface ShutdownButtonProps {
  vm: VM;
  disabled: boolean;
  setIsHalting: React.Dispatch<React.SetStateAction<boolean>>;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;
}

const ShutdownButton = ({
  vm,
  disabled,
  setIsHalting,
  vmMutation,
  addAlert,
}: ShutdownButtonProps) => {
  const handleShutdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHalting(true);
    addAlert(`Sending shutdown signal to VM "${vm.name}"...`, 'info');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'shutdown', name: vm.name },
      {
        onSuccess: () => addAlert(`Shutdown initiated for VM "${vm.name}".`, 'success'),
        onError: () => addAlert(`Failed to shutdown VM "${vm.name}".`, 'error'),
      }
    );
  };

  const isInactive = vm.status !== 'running' || disabled;

  return (
    <ActionButton
      onClick={handleShutdown}
      disabled={isInactive}
      className={isInactive ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Shutdown
    </ActionButton>
  );
};

export default ShutdownButton;
