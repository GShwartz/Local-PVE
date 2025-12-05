import { useState, useRef, useEffect } from 'react';
import { FiPlus, FiBell, FiLogOut } from 'react-icons/fi';
import { Alert } from '../Alerts';
import styles from '../../CSS/Navbar.module.css';

interface NavbarProps {
  onCreateClick: () => void;
  onLogout: () => void;
  alertHistory: Alert[];
}

const Navbar = ({ onCreateClick, onLogout, alertHistory }: NavbarProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [order, setOrder] = useState<'newToOld' | 'oldToNew'>('newToOld');
  const [alerts, setAlerts] = useState(alertHistory);
  const [showPopconfirm, setShowPopconfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popconfirmRef = useRef<HTMLDivElement>(null);

  // ... (rest of logic unchanged until return)

  // Track if history was cleared to prevent prop updates
  const [isHistoryCleared, setIsHistoryCleared] = useState(false);
  const lastAlertCount = useRef(alertHistory.length);

  useEffect(() => {
    if (!isHistoryCleared) {
      setAlerts(alertHistory);
      lastAlertCount.current = alertHistory.length;
    } else if (alertHistory.length > lastAlertCount.current) {
      setAlerts(prev => [...prev, ...alertHistory.slice(lastAlertCount.current)]);
      lastAlertCount.current = alertHistory.length;
    }
  }, [alertHistory, isHistoryCleared]);

  useEffect(() => {
    if (!showHistory) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideHistory = historyRef.current && !historyRef.current.contains(target);
      const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const clickedOutsidePopconfirm = popconfirmRef.current && !popconfirmRef.current.contains(target);

      if (clickedOutsideHistory && clickedOutsideButton && (!showPopconfirm || clickedOutsidePopconfirm)) {
        setShowHistory(false);
        setShowPopconfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory, showPopconfirm]);

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'warning': return 'text-yellow-300';
      default: return 'text-gray-300';
    }
  };

  let displayedAlerts = [...alerts];
  if (order === 'newToOld') {
    displayedAlerts = displayedAlerts.slice().reverse();
  }

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrder(e.target.value as 'newToOld' | 'oldToNew');
    e.target.blur();
  };

  const handleClearHistory = () => {
    setAlerts([]);
    setShowPopconfirm(false);
    lastAlertCount.current = alertHistory.length;
    setIsHistoryCleared(true);
  };

  const unreadCount = alerts.length;

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-container']}>
        <div className={styles['navbar-left']}>
          <span className={styles['navbar-title']}>Local-PVE</span>
          <button onClick={onCreateClick} className={styles['create-vm-button']}>
            <FiPlus className="text-lg" />
            <span>Create VM</span>
          </button>
        </div>
        <div className={styles['navbar-right']}>
          <button
            ref={buttonRef}
            onClick={() => setShowHistory((prev) => !prev)}
            className={`${styles['notifications-button']} ${unreadCount > 0 ? 'text-white' : ''}`}
          >
            <div className="relative">
              <FiBell className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
              )}
            </div>
            <span className="ml-2 hidden sm:inline">Notifications</span>
          </button>

          <button onClick={onLogout} className={styles['logout-button']}>
            <FiLogOut className="text-lg" />
            <span>Logout</span>
          </button>
          {showHistory && (
            <div
              ref={historyRef}
              className={styles['history-container']}
            >
              <table className={styles['history-table']}>
                <thead>
                  <tr>
                    <th scope="col" className={`${styles['history-table-th']} w-1/4`}>
                      <div className={styles['filter-container']}>
                        <select
                          value={order}
                          onChange={handleOrderChange}
                          className={`${styles['filter-select']} ${alerts.length === 0 ? styles['filter-select:disabled'] : ''}`}
                          disabled={alerts.length === 0}
                        >
                          <option value="newToOld">Newer</option>
                          <option value="oldToNew">Older</option>
                        </select>
                      </div>
                    </th>
                    <th scope="col" className={`${styles['history-table-th']} w-3/4`}>
                      <div className={styles['message-header-container']}>
                        <span className={styles['message-header']}>Message</span>
                        <div className={styles['clear-button-container']}>
                          <button
                            onClick={() => setShowPopconfirm(true)}
                            className={`${styles['clear-button']} ${alerts.length === 0 ? styles['clear-button:disabled'] : ''}`}
                            title="Clear History"
                            disabled={alerts.length === 0}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M9 7v12m6-12v12M3 3h18" />
                            </svg>
                          </button>
                        </div>
                        {showPopconfirm && (
                          <div
                            ref={popconfirmRef}
                            className={styles.popconfirm}
                          >
                            <p className={styles['popconfirm-text']}>Are you sure you want to clear the history?</p>
                            <div className={styles['popconfirm-buttons']}>
                              <button
                                onClick={() => setShowPopconfirm(false)}
                                className={styles['popconfirm-cancel']}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleClearHistory}
                                className={styles['popconfirm-confirm']}
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAlerts.map((alert) => (
                    <tr key={alert.id} className={styles['history-table-tr']}>
                      <td className={`${styles['history-table-td']} font-medium ${getTextColor(alert.type)} text-center!`}>{alert.type}</td>
                      <td className={styles['history-table-td']}>{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;