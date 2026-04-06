interface ClonePopoverProps {
  cloneName: string;
  onChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Proxmox hostname rule: letters, numbers, hyphens; 1–63 chars; no leading/trailing hyphen
const isValidCloneName = (n: string) => /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(n);

const ClonePopover = ({ cloneName, onChange, onConfirm, onCancel }: ClonePopoverProps) => {
  const valid = isValidCloneName(cloneName);
  return (
    <span
      className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-md p-3 flex flex-col gap-1.5 z-50 min-w-[200px] shadow-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={cloneName}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 p-1 bg-gray-100 text-gray-900 rounded-md text-sm border ${valid || !cloneName ? 'border-gray-300' : 'border-red-500'}`}
          placeholder="Clone name"
        />
        <button
          onClick={valid ? onConfirm : undefined}
          disabled={!valid}
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
        <p className="text-red-400 text-[10px] leading-tight">Letters, numbers, hyphens only. No underscores.</p>
      )}
    </span>
  );
};

export default ClonePopover;
