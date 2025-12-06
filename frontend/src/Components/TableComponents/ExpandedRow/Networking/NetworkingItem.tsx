import { useState, useRef, useEffect } from 'react';
import { NetworkInterface } from './NetworkingView';
import { Copy } from 'lucide-react';
import styles from '../../../../CSS/ExpandedArea.module.css';

interface NetworkingItemProps {
  net: NetworkInterface;
  onRemove: (name: string) => void;
  onEdit: (nic: NetworkInterface) => void;
  onCopyMac: (mac: string) => void;
  vmStatus: string;
  ipAddress?: string;
}

const NetworkingItem = ({
  net,
  onRemove,
  onEdit,
  onCopyMac,
  vmStatus,
  ipAddress
}: NetworkingItemProps) => {
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDisabled = vmStatus !== 'stopped';

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleTooltip = (e: React.MouseEvent<HTMLDivElement>, message: string) => {
    if (!isDisabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 30,
      left: rect.left + rect.width / 2
    });

    setTooltipMessage(message);

    hoverTimerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 1000);
  };

  const clearTooltip = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div className="p-3 text-sm text-gray-900 rounded-lg bg-gray-700 dark:text-white flex flex-col gap-1 relative">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-semibold">{net.name}</span>
          <span className="ml-2">{net.model}</span>
        </div>
        <div className="flex gap-2">
          <div
            onMouseEnter={(e) => handleTooltip(e, `VM must be off to edit (current: ${vmStatus})`)}
            onMouseLeave={clearTooltip}
          >
            <button
              onClick={() => onEdit(net)}
              disabled={isDisabled}
              className={`${styles['button-small']} ${styles['button-small-yellow']} ${isDisabled ? styles['button-small-disabled'] : ''}`}
            >
              Edit
            </button>
          </div>

          <div
            onMouseEnter={(e) => handleTooltip(e, `VM must be off to remove (current: ${vmStatus})`)}
            onMouseLeave={clearTooltip}
          >
            <button
              onClick={() => onRemove(net.name)}
              disabled={isDisabled}
              className={`${styles['button-small']} ${styles['button-small-red']} ${isDisabled ? styles['button-small-disabled'] : ''}`}
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {net.macaddr && (
        <div className="text-gray-300 text-xs flex items-center gap-1 relative">
          <span className="select-none">MAC Address: {net.macaddr}</span>
          <button
            onClick={() => onCopyMac(net.macaddr!)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPosition({
                top: rect.top - 30,
                left: rect.left + rect.width / 2
              });
              hoverTimerRef.current = setTimeout(() => {
                setTooltipMessage('Copy MAC');
                setShowTooltip(true);
              }, 1000);
            }}
            onMouseLeave={clearTooltip}
            className="text-gray-400 hover:text-white p-0.5"
            style={{ width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Copy size={14} />
          </button>
        </div>
      )}

      {/* IP Address Line - Positioned between MAC and Firewall */}
      <div className="text-gray-300 text-xs flex items-center gap-1 relative">
        <span className="select-none">IP Address: {ipAddress || '—'}</span>
      </div>

      {showTooltip && (
        <div
          className="note-tooltip show"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
        >
          {tooltipMessage}
        </div>
      )}

      <div className="flex justify-between text-gray-300 text-xs">
        <span>Firewall: {net.firewall ? 'Enabled' : 'Disabled'}</span>
        <span>Link: {net.link_down ? 'Down' : 'Up'}</span>
      </div>

      {net.queues !== undefined && (
        <div className="flex justify-between text-gray-300 text-xs">
          <span>Queues: {net.queues}</span>
          <span>Rate: {net.rate ?? '-'} Mbps</span>
        </div>
      )}

      {net.tag !== undefined && (
        <div className="flex justify-between text-gray-300 text-xs">
          <span>VLAN Tag: {net.tag}</span>
          <span>Trunks: {net.trunks ?? '-'}</span>
        </div>
      )}

      {net.mtu !== undefined && (
        <div className="flex justify-between text-gray-300 text-xs">
          <span>MTU: {net.mtu}</span>
        </div>
      )}
    </div>
  );
};

export default NetworkingItem;
