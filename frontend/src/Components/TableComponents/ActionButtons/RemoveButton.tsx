import ActionButton from './ActionButton';
import RemoveConfirmModal from './RemoveConfirmModal';

interface RemoveButtonProps {
  disabled: boolean;
  vmName: string;
  onConfirm: () => void;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
}

const RemoveButton = ({
  disabled,
  vmName,
  onConfirm,
  showConfirm,
  setShowConfirm,
}: RemoveButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  return (
    <div className="flex-1 text-center relative inline-block">
      <ActionButton
        onClick={handleClick}
        disabled={disabled}
        variant="red"
      >
        Remove
      </ActionButton>

      {showConfirm && (
        <RemoveConfirmModal
          vmName={vmName}
          onConfirm={() => {
            setShowConfirm(false);
            onConfirm();
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

export default RemoveButton;
