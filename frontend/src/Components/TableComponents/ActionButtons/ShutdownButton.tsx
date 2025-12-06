import { FiPower } from 'react-icons/fi';
import ActionButton from './ActionButton';

interface ShutdownButtonProps {
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const ShutdownButton = ({ disabled, onClick }: ShutdownButtonProps) => {
  return (
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={disabled}
      variant="purple"
    >
      <FiPower size={14} /> Shutdown
    </ActionButton>
  );
};

export default ShutdownButton;