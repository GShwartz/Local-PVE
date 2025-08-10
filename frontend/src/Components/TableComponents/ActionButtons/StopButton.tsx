import ActionButton from './ActionButton';

interface StopButtonProps {
  disabled: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const StopButton = ({ disabled, onClick }: StopButtonProps) => {
  return (
    <ActionButton
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={disabled}
      className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Stop
    </ActionButton>
  );
};

export default StopButton;
