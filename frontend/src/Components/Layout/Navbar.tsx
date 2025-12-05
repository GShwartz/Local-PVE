import { useState, useRef, useEffect } from 'react';
import { FiPlus, FiBell, FiLogOut, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { Alert } from '../Alerts';
import styles from '../../CSS/Navbar.module.css';

interface NavbarProps {
  onCreateClick: () => void;
  onLogout: () => void;
  alertHistory: Alert[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const Navbar = ({ onCreateClick, onLogout, alertHistory, markAsRead, markAllAsRead }: NavbarProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [order, setOrder] = useState<'newToOld' | 'oldToNew'>('newToOld');
  const [alerts, setAlerts] = useState(alertHistory);
  const [showPopconfirm, setShowPopconfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popconfirmRef = useRef<HTMLDivElement>(null);

  // Track if history was cleared to prevent prop updates
  const [isHistoryCleared, setIsHistoryCleared] = useState(false);
  const lastAlertCount = useRef(alertHistory.length);

  // Update alerts when history prop changes, unless cleared
  useEffect(() => {
    if (!isHistoryCleared) {
      setAlerts(alertHistory);
      lastAlertCount.current = alertHistory.length;
    } else if (alertHistory.length > lastAlertCount.current) {
      // If new alerts come in even after clear, append them
      const newAlerts = alertHistory.slice(lastAlertCount.current);
      setAlerts(prev => [...prev, ...newAlerts]);
      setIsHistoryCleared(false); // Reset clear status if new alerts come
      lastAlertCount.current = alertHistory.length;
    } else {
      // If history matches length but changed content (e.g. read status update from App), we should update local alerts
      setAlerts(prev => prev.map(a => {
        const fresh = alertHistory.find(h => h.id === a.id);
        return fresh ? fresh : a;
      }));
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

  const handleAlertClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead(id);
    }
  };

  // Count unread based on local alerts state (which is synced with props)
  const unreadCount = alerts.filter(a => !a.read).length;

  let displayedAlerts = [...alerts];
  if (order === 'newToOld') {
    displayedAlerts.reverse();
  }

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
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10">
                  {unreadCount > 9 ? '9+' : unreadCount}
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
                        <div className="flex items-center gap-2 ml-auto mr-4 relative">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-blue-400 hover:text-blue-300 transition-colors tooltip-trigger"
                              title="Mark all as read"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <div className={styles['clear-button-container'] + " !ml-0 !mr-0"}>
                            <button
                              onClick={() => setShowPopconfirm(true)}
                              className={`${styles['clear-button']} ${alerts.length === 0 ? styles['clear-button:disabled'] : ''}`}
                              title="Clear History"
                              disabled={alerts.length === 0}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                    <tr
                      key={alert.id}
                      className={`${styles['history-table-tr']} cursor-pointer transition-colors duration-200 ${alert.read ? 'opacity-50 hover:opacity-75' : 'hover:bg-white/5'}`}
                      onClick={() => handleAlertClick(alert.id, alert.read)}
                    >
                      <td className={`${styles['history-table-td']} font-medium ${getTextColor(alert.type)} text-center!`}>
                        <div className="flex items-center justify-center gap-2">
                          {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                          {alert.type}
                        </div>
                      </td>
                      <td className={styles['history-table-td']}>
                        <div className="flex flex-col">
                          <span>{alert.message}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedAlerts.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-gray-500 italic">No notifications</td>
                    </tr>
                  )}
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