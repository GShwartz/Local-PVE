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
      className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    >
      Shutdown
    </ActionButton>
  );
};

export default ShutdownButton;
