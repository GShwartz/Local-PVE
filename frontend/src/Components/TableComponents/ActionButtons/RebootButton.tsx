import { FiRotateCw } from 'react-icons/fi';
import ActionButton from './ActionButton';

interface RebootButtonProps {
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const RebootButton = ({ disabled, onClick }: RebootButtonProps) => {
  return (
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={disabled}
      variant="yellow"
    >
      <FiRotateCw size={13} /> Reboot
    </ActionButton>
  );
};

export default RebootButton;