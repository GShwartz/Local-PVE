import React from 'react';

interface ApplyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChanges: boolean;
  requiresVMStopped: boolean;
  isApplying: boolean;
}

const ApplyButton = ({ onClick, hasChanges, requiresVMStopped, isApplying }: ApplyButtonProps) => {
  const isDisabled = !hasChanges || requiresVMStopped || isApplying;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`px-2 py-1 text-base font-medium rounded-md active:scale-95 transition-transform duration-100 text-white ${
        isDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
      }`}
      style={{ height: '34px', lineHeight: '1.5' }}
    >
      {isApplying ? 'Apply' : 'Apply'}
    </button>
  );
};

export default ApplyButton;
