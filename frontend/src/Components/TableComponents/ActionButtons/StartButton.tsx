import { FiPlay } from 'react-icons/fi';
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

  /** Called right after the action is sent (used to trigger the wide loader) */
  onSent?: () => void;
  /** Called when the mutation errors — parent uses this to reset state after notification duration */
  onError?: () => void;
}

const StartButton = ({
  vm,
  disabled,
  isStarting: _isStarting,
  setIsStarting,
  vmMutation,
  addAlert,
  onSent,
  onError,
}: StartButtonProps) => {
  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarting(true);
    addAlert(`Starting VM "${vm.name}"...`, 'info');

    // Inform parent so it can show the wide loader under the buttons
    onSent?.();

    // Send the action
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'start', name: vm.name },
      {
        onSuccess: () => addAlert(`VM "${vm.name}" successfully started.`, 'success'),
        onError: () => {
          addAlert(`Failed to start VM "${vm.name}".`, 'error');
          onError?.();
        },
      }
    );
  };

  // Explicitly enable only when the VM is 'stopped' and not globally disabled.
  const isInactive = vm.status !== 'stopped' || disabled;

  return (
    <ActionButton
      onClick={handleStart}
      disabled={isInactive}
      variant="blue"
    >
      <FiPlay size={13} /> Start
    </ActionButton>
  );
};

export default StartButton;