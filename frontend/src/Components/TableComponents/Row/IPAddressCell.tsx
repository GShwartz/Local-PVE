// Row/IPAddressCell.tsx
import { useState, useRef, useEffect } from 'react';
import { VM } from '../../../types';
import { Copy } from 'lucide-react';


interface IPAddressCellProps {
  vm: VM;
}

const IPAddressCell = ({ vm }: IPAddressCellProps) => {
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (!vm.ip_address || vm.ip_address === 'N/A') return;
    navigator.clipboard.writeText(vm.ip_address);
    setTooltipMessage('Copied!');
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1200);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 30,
      left: rect.left + rect.width / 2,
    });
    hoverTimerRef.current = setTimeout(() => {
      setTooltipMessage('Copy IP');
      setShowTooltip(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  const shouldShowCopy = vm.ip_address && vm.ip_address !== 'N/A';

  const hideCopy =
    vm.ip_address === 'N/A' && vm.status === 'stopped';

  return (
    <td className="px-2 sm:px-6 py-2 sm:py-4 text-center relative">
      <div className="flex items-center justify-center gap-1 text-sm text-white">
        <span className="select-none">{vm.ip_address}</span>
        {shouldShowCopy && !hideCopy && (
          <button
            onClick={handleCopy}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <Copy size={14} />
          </button>
        )}
      </div>

      {showTooltip && (
        <div
          className="note-tooltip show absolute z-10 bg-black text-white text-xs rounded px-2 py-1"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltipMessage}
        </div>
      )}
    </td>
  );
};

export default IPAddressCell;
