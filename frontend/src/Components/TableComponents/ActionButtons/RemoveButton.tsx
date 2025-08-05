import ActionButton from './ActionButton';

interface RemoveButtonProps {
  disabled: boolean;
  onConfirm: () => void;
  showConfirm: boolean;
  setShowConfirm: React.Dispatch<React.SetStateAction<boolean>>;
}

const RemoveButton = ({
  disabled,
  onConfirm,
  showConfirm,
  setShowConfirm,
}: RemoveButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm((v) => !v);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
    onConfirm();
  };

  return (
    <>
      <ActionButton
        onClick={handleClick}
        disabled={disabled}
        className={disabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-pink-700 hover:bg-pink-800'}
      >
        Remove
      </ActionButton>

      {showConfirm && (
        <div className="absolute z-50 mt-2">
          <span
            className="bg-gray-800 border border-gray-600 rounded-md p-3 flex items-center space-x-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleConfirm}
              className="text-white bg-green-600 hover:bg-green-500 rounded-md px-3 py-1"
              style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
            >
              ✔
            </button>
            <button
              onClick={handleCancel}
              className="text-white bg-red-600 hover:bg-red-500 rounded-md px-3 py-1"
              style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
            >
              ✖
            </button>
          </span>
        </div>
      )}
    </>
  );
};

export default RemoveButton;
