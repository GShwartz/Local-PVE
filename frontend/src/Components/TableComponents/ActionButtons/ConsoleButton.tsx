import React from 'react';
import { FiTerminal } from 'react-icons/fi';
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
    <FiTerminal size={14} /> Console
  </ActionButton>
);

export default ConsoleButton;