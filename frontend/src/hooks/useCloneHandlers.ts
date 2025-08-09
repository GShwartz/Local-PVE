import { UseMutationResult } from '@tanstack/react-query';
import { VM } from '../types';

interface Params {
  vm: VM;
  setIsCloning: (v: boolean) => void;
  setIsCloningInProgress: (v: boolean) => void;
  addAlert: (m: string, t: string) => void;
  vmMutation: UseMutationResult<any, any, { vmid: number; action: string; name?: string }>;
  cloneName: string;
}

export const useCloneHandlers = ({
  vm,
  setIsCloning,
  setIsCloningInProgress,
  addAlert,
  vmMutation,
  cloneName,
}: Params) => {
  const handleConfirmClone = () => {
    setIsCloning(false);
    setIsCloningInProgress(true);
    addAlert(`Cloning process for VM ${vm.name} has started. Target name: "${cloneName}".`, 'info');
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
          setIsCloningInProgress(false);
          addAlert(`Cloning of VM "${vm.name}" to "${cloneName}" successfully initiated.`, 'success');
        },
        onError: () => {
          setIsCloningInProgress(false);
          addAlert(`Cloning of VM "${vm.name}" failed.`, 'error');
        },
      }
    );
  };

  const handleCancelClone = () => {
    setIsCloning(false);
    addAlert(`Clone operation for VM "${vm.name}" was cancelled.`, 'info');
  };

  return { handleConfirmClone, handleCancelClone };
};
