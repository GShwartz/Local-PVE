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
      Reboot
    </ActionButton>
  );
};

export default RebootButton;
