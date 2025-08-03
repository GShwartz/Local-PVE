import React from 'react';

interface ApplyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChanges: boolean;
  requiresVMStopped: boolean;
  isApplying: boolean;
}

const ApplyButton = ({ onClick, hasChanges, requiresVMStopped, isApplying }: ApplyButtonProps) => {
  const isDisabled = !hasChanges || requiresVMStopped || isApplying;

  const baseClasses = 'px-2 py-1 text-sm font-medium rounded-md text-white transition-none';

  const enabledClasses = 'bg-orange-600 hover:bg-orange-700 active:scale-95';
  const disabledClasses = 'bg-gray-600 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${isDisabled ? disabledClasses : enabledClasses}`}
    >
      {isApplying ? 'Apply' : 'Apply'}
    </button>
  );
};

export default ApplyButton;
