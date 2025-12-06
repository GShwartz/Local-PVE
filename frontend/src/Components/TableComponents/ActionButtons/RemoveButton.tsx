import ActionButton from './ActionButton';
import RemoveConfirmModal from './RemoveConfirmModal';

interface RemoveButtonProps {
  disabled: boolean;
  onConfirm: () => void;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  vmName: string;
  vmId: number;
}

const RemoveButton = ({
  disabled,
  onConfirm,
  showConfirm,
  setShowConfirm,
  vmName,
  vmId,
}: RemoveButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onConfirm();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className="flex-1 min-w-[5rem] text-center relative inline-block">
        <ActionButton
          onClick={handleClick}
          disabled={disabled}
          variant="red"
        >
          Remove
        </ActionButton>
      </div>

      <RemoveConfirmModal
        isOpen={showConfirm}
        vmName={vmName}
        vmId={vmId}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default RemoveButton;
