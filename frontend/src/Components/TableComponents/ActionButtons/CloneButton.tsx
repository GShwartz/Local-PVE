import ActionButton from './ActionButton';
import ClonePopover from './ClonePopover';

interface CloneButtonProps {
  disabled: boolean;
  showCloningLabel: boolean;
  isCloning: boolean;
  cloneName: string;
  onToggle: () => void;
  onChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const CloneButton = ({
  disabled,
  showCloningLabel,
  isCloning,
  cloneName,
  onToggle,
  onChange,
  onConfirm,
  onCancel,
}: CloneButtonProps) => {
  return (
    <div className="flex-1 min-w-[5rem] text-center relative">
      <ActionButton
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={disabled}
        variant="purple"
      >
        {showCloningLabel ? 'Cloning...' : 'Clone'}
      </ActionButton>

      {isCloning && (
        <div className="absolute z-50 mt-2">
          <ClonePopover
            cloneName={cloneName}
            onChange={onChange}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </div>
      )}
    </div>
  );
};

export default CloneButton;
