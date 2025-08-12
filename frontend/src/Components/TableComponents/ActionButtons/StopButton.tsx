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

  // Reset when VM actually stops
  useEffect(() => {
    if (wasClicked && vmStatus?.toLowerCase() === 'stopped') {
      setWasClicked(false);
    }
  }, [vmStatus, wasClicked]);

  const isDisabled = disabled || wasClicked;

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