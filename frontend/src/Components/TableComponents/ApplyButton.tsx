import React from 'react';

interface ApplyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hasChanges: boolean;
  requiresVMStopped: boolean;
  isApplying: boolean;
}

const ApplyButton = ({ onClick, hasChanges, requiresVMStopped, isApplying }: ApplyButtonProps) => (
  <button
    onClick={onClick}
    disabled={!hasChanges || requiresVMStopped || isApplying}
    className={`px-2 py-1 text-sm font-medium rounded-md text-white ${
      hasChanges && !requiresVMStopped ? 'bg-orange-600 hover:bg-orange-700 active:scale-95' : 'bg-gray-600 cursor-not-allowed'
    }`}
  >
    {isApplying ? 'Apply' : 'Apply'}
  </button>
);

export default ApplyButton;
