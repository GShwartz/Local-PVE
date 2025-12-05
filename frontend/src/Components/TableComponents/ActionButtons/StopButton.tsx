import { useState, useEffect } from 'react';
import ActionButton from './ActionButton';

interface StopButtonProps {
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
  vmStatus?: string;
}

const StopButton = ({ 
  disabled, 
  onClick, 
  vmStatus
}: StopButtonProps) => {
  const [wasClicked, setWasClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWasClicked(true);
    onClick(e);
  };

  const normalizedStatus = (vm.status || '').trim().toLowerCase();
  // Allow Stop when VM is running OR paused/hibernate/suspended (when Resume would show)
  const canStop =
    normalizedStatus === 'running' ||
    normalizedStatus === 'paused' ||
    normalizedStatus === 'hibernate' ||
    normalizedStatus === 'suspended';

  const isInactive = disabled || !canStop;

  return (
    <ActionButton
      onClick={handleClick}
      disabled={isDisabled}
      className={isDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Stop
    </ActionButton>
  );
};

export default StopButton;