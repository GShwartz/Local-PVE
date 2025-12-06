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
    variant="blue"
  >
    Console
  </ActionButton>
);

export default ConsoleButton;
