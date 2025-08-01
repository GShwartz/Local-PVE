interface ClonePopoverProps {
  cloneName: string;
  onChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ClonePopover = ({ cloneName, onChange, onConfirm, onCancel }: ClonePopoverProps) => (
  <span
    className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-md p-3 flex items-center space-x-2 z-50"
    onClick={(e) => e.stopPropagation()}
  >
    <input
      type="text"
      value={cloneName}
      onChange={(e) => onChange(e.target.value)}
      className="w-40 p-1 bg-gray-900 text-white rounded-md text-sm"
      placeholder="Clone name"
    />
    <button
      onClick={onConfirm}
      className="text-white bg-green-600 hover:bg-green-500 rounded-md px-3 py-1"
      style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
    >
      ✔
    </button>
    <button
      onClick={onCancel}
      className="text-white bg-red-600 hover:bg-red-500 rounded-md px-3 py-1"
      style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
    >
      ✖
    </button>
  </span>
);

export default ClonePopover;
