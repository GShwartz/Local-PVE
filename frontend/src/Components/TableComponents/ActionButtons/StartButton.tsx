import ActionButton from './ActionButton';
import { VM } from '../../../types';
import { UseMutationResult } from '@tanstack/react-query';

interface StartButtonProps {
  vm: VM;
  disabled: boolean;
  /** Existing prop — keep it to preserve current API */
  isStarting: boolean;
  setIsStarting: React.Dispatch<React.SetStateAction<boolean>>;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  addAlert: (msg: string, type: string) => void;

  /** Deprecated for now (loader moved under buttons), kept for compatibility */
  showLoader?: boolean;

  /** NEW: called right after the action is sent (used to trigger the wide loader) */
  onSent?: () => void;
}

const StartButton = ({
  vm,
  disabled,
  setIsStarting,
  vmMutation,
  addAlert,
  onSent,
}: StartButtonProps) => {
  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarting(true);
    addAlert(`Starting VM "${vm.name}"...`, 'info');

    // Send the action
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'start', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" successfully started.`, 'success'),
        onError: () => addAlert(`Failed to start VM "${vm.name}".`, 'error'),
      }
    );

    // Inform parent so it can show the wide loader under the buttons
    onSent?.();
  };

  // Explicitly enable only when the VM is 'stopped' and not globally disabled.
  const isInactive = vm.status !== 'stopped' || disabled;

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
