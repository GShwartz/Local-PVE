import React from 'react';
import ActionButton from './ActionButton';

interface ConsoleButtonProps {
  onClick: (e: React.MouseEvent) => void;
  disabled: boolean;
}

const ConsoleButton = ({ onClick, disabled }: ConsoleButtonProps) => (
  <ActionButton
    onClick={onClick}
    disabled={disabled}
    className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
  >
    Console
  </ActionButton>
);

export default ConsoleButton;
