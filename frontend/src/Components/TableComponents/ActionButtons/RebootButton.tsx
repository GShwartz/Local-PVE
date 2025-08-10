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
      className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Reboot
    </ActionButton>
  );
};

export default RebootButton;
