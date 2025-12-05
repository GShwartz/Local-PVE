import styles from '../../../../CSS/ExpandedArea.module.css';
import { useRef, useState, useEffect } from 'react';

interface NetworkingHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onAddNIC: () => void;
  vmStatus: string;
}

const NetworkingHeader = ({ loading, onRefresh, onAddNIC, vmStatus }: NetworkingHeaderProps) => {
  const disableAddNIC = ['running', 'paused', 'suspended', 'hibernated'].includes(vmStatus);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tooltipMessage = `VM must be off to add NIC (current: ${vmStatus})`;

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableAddNIC) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 30,
        left: rect.left + rect.width / 2
      });

      hoverTimerRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div className="flex gap-2">

      <div className="flex gap-2">
        <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <button
            onClick={onAddNIC}
            disabled={disableAddNIC}
            className={`${styles.button} ${styles['button-blue']} ${disableAddNIC ? styles['button-disabled'] : ''}`}
          >
            Add NIC
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className={`${styles.button} ${loading ? styles['button-disabled'] : styles['button-blue']}`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
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
    </div>
  );
};

export default NetworkingHeader;
