import React from 'react';
import ActionButton from './ActionButton';

interface ApplyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChanges: boolean;
  requiresVMStopped: boolean;
  isApplying: boolean;
}

const ApplyButton = ({
  onClick,
  hasChanges,
  requiresVMStopped,
  isApplying,
}: ApplyButtonProps) => {
  const isDisabled = !hasChanges || requiresVMStopped || isApplying;

  return (
    <ActionButton
      onClick={onClick}
      disabled={isDisabled}
      className={isDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}
    >
      {isApplying ? 'Apply' : 'Apply'}
    </ActionButton>
  );
};

export default ApplyButton;
