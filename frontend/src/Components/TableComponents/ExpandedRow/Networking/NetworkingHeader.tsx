import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import styles from '../../../../CSS/ExpandedArea.module.css';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const buttonRef = useRef<HTMLDivElement>(null);

  const tooltipMessage = `VM must be off to add NIC (current: ${vmStatus})`;

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (disableAddNIC && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8,
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
      <div ref={buttonRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <button
          onClick={onAddNIC}
          disabled={disableAddNIC}
          className={`${styles.button} ${styles['button-blue']} ${disableAddNIC ? styles['button-disabled'] : ''}`}
        >
          <FiPlus size={14} /> Add NIC
        </button>
      </div>

      {showTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translate(-50%, -100%)',
            padding: '8px 12px',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.6)',
            borderRadius: '8px',
            color: '#f3f4f6',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
          }}
        >
          {tooltipMessage}
        </div>,
        document.body
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className={`${styles.button} ${loading ? styles['button-disabled'] : styles['button-blue']}`}
      >
        <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
};

export default NetworkingHeader;