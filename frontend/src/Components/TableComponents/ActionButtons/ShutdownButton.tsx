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
      Shutdown
    </ActionButton>
  );
};

export default ShutdownButton;
