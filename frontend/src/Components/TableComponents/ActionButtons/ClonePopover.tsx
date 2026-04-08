interface ClonePopoverProps {
  cloneName: string;
  existingNames: string[];
  onChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Proxmox hostname rule: letters, numbers, hyphens, dots; 1–63 chars; no leading/trailing hyphen
const isValidCloneName = (n: string) => /^[a-zA-Z0-9]([a-zA-Z0-9.-]{0,61}[a-zA-Z0-9])?$/.test(n);

const ClonePopover = ({ cloneName, existingNames, onChange, onConfirm, onCancel }: ClonePopoverProps) => {
  const valid = isValidCloneName(cloneName);
  const isDuplicate = valid && existingNames.includes(cloneName);
  const canConfirm = valid && !isDuplicate;

  return (
    <span
      className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-md p-3 flex flex-col gap-1.5 z-50 min-w-[220px] shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={cloneName}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 p-1 bg-gray-50 text-gray-900 rounded-md text-sm border ${
            isDuplicate ? 'border-orange-400' : valid || !cloneName ? 'border-gray-300' : 'border-red-500'
          }`}
          placeholder="Clone name"
          autoFocus
        />
        <button
          onClick={canConfirm ? onConfirm : undefined}
          disabled={!canConfirm}
          className="text-white bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md px-3 py-1"
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
      </div>
      {cloneName && !valid && (
        <p className="text-red-500 text-[10px] leading-tight">Letters, numbers, hyphens and dots only.</p>
      )}
      {isDuplicate && (
        <p className="text-orange-500 text-[10px] leading-tight">A VM with this name already exists.</p>
      )}
    </span>
  );
};

export default ClonePopover;
