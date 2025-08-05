import { useEffect, useRef } from 'react';
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
  const popupRef = useRef<HTMLDivElement>(null);

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

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };

    if (showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfirm, setShowConfirm]);

  return (
    <div className="relative inline-block">
      <ActionButton
        onClick={handleClick}
        disabled={disabled}
        className={
          disabled
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-pink-700 hover:bg-pink-800'
        }
      >
        Remove
      </ActionButton>

      {showConfirm && (
        <div
          ref={popupRef}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-[999999] animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="bg-gray-800 border border-gray-600 rounded-md p-3 flex items-center space-x-2">
            <button
              onClick={handleConfirm}
              className="text-white bg-green-600 hover:bg-green-500 rounded-md px-3 py-1"
              style={{
                fontSize: '1.25rem',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1',
              }}
            >
              ✔
            </button>
            <button
              onClick={handleCancel}
              className="text-white bg-red-600 hover:bg-red-500 rounded-md px-3 py-1"
              style={{
                fontSize: '1.25rem',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1',
              }}
            >
              ✖
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default RemoveButton;
