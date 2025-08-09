import ActionButton from './ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface RebootButtonProps {
  vm: VM;
  disabled: boolean;
  setIsRebooting: React.Dispatch<React.SetStateAction<boolean>>;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;

  /** Optional: delay duration (ms) passed from ActionButtons */
  loaderMinDuration?: number;
}

const RebootButton = ({
  vm,
  disabled,
  setIsRebooting,
  vmMutation,
  addAlert,
}: RebootButtonProps) => {
  const handleReboot = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRebooting(true);
    addAlert(`Rebooting VM "${vm.name}".`, 'info');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'reboot', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" reboot initiated.`, 'success'),
        onError: () => addAlert(`Failed to reboot VM "${vm.name}".`, 'error'),
      }
    );
  };

  const isInactive = vm.status !== 'running' || disabled;

  return (
    <ActionButton
      onClick={handleReboot}
      disabled={isInactive}
      className={isInactive ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Reboot
    </ActionButton>
  );
};

export default RebootButton;
