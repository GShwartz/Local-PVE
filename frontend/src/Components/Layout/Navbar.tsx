import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { FiBell, FiLogOut, FiCheckCircle, FiTrash2, FiUser } from 'react-icons/fi';
import { Menu, PanelLeftClose, Server } from 'lucide-react';
import { Alert } from '../Alerts';
import styles from '../../CSS/Navbar.module.css';

interface NavbarProps {
  username?: string;
  onLogout: () => void;
  alertHistory: Alert[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const Navbar = ({ username, onLogout, alertHistory, markAsRead, markAllAsRead, sidebarOpen = true, onToggleSidebar }: NavbarProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [order, setOrder] = useState<'newToOld' | 'oldToNew'>('newToOld');
  const [alerts, setAlerts] = useState(alertHistory);
  const [showPopconfirm, setShowPopconfirm] = useState(false);
  const [popconfirmPos, setPopconfirmPos] = useState({ top: 0, right: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popconfirmRef = useRef<HTMLDivElement>(null);
  const trashButtonRef = useRef<HTMLButtonElement>(null);

  const [isHistoryCleared, setIsHistoryCleared] = useState(false);
  const lastAlertCount = useRef(alertHistory.length);

  // Sync local alerts from parent alertHistory
  useEffect(() => {
    if (!isHistoryCleared) {
      setAlerts(alertHistory);
      lastAlertCount.current = alertHistory.length;
    } else if (alertHistory.length > lastAlertCount.current) {
      const newAlerts = alertHistory.slice(lastAlertCount.current);
      setAlerts(prev => [...prev, ...newAlerts]);
      setIsHistoryCleared(false);
      lastAlertCount.current = alertHistory.length;
    } else {
      setAlerts(prev => prev.map(a => {
        const fresh = alertHistory.find(h => h.id === a.id);
        return fresh ? fresh : a;
      }));
    }
  }, [alertHistory, isHistoryCleared]);

  // Close dropdown on outside click
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHistory, showPopconfirm]);

  // Close popconfirm on outside click (fixed-position popconfirm needs its own listener)
  useEffect(() => {
    if (!showPopconfirm) return;
    const handleClick = (e: MouseEvent) => {
      if (popconfirmRef.current && !popconfirmRef.current.contains(e.target as Node) &&
          trashButtonRef.current && !trashButtonRef.current.contains(e.target as Node)) {
        setShowPopconfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopconfirm]);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'error':   return 'bg-red-100 text-red-700';
      case 'info':    return 'bg-blue-100 text-blue-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      default:        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOrderChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setOrder(e.target.value as 'newToOld' | 'oldToNew');
    e.target.blur();
  };

  const handleClearClick = () => {
    if (trashButtonRef.current) {
      const rect = trashButtonRef.current.getBoundingClientRect();
      setPopconfirmPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setShowPopconfirm(true);
  };

  const handleClearHistory = () => {
    setAlerts([]);
    setShowPopconfirm(false);
    lastAlertCount.current = alertHistory.length;
    setIsHistoryCleared(true);
  };

  // Fix #1: mark read immediately in local state + propagate to parent
  const handleAlertClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    }
  };

  const unreadCount = alerts.filter(a => !a.read).length;
  let displayedAlerts = [...alerts];
  if (order === 'newToOld') displayedAlerts.reverse();

  return (
    <nav className={styles.navbar}>
      <div className={styles['navbar-container']}>

        {/* Left: Local-PVE logo + sidebar toggle */}
        <div className={styles['navbar-left']}>
          {/* Logo */}
          <div className="flex items-center gap-2 mr-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white shadow-sm flex-shrink-0">
              <Server size={14} strokeWidth={2.2} />
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight select-none">Local-PVE</span>
          </div>

          {/* Sidebar toggle */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>

        {/* Right: notifications + username + logout */}
        <div className={styles['navbar-right']}>
          {username && (
            <div className={styles['username-badge']}>
              <FiUser className="text-gray-500 text-sm" />
              <span>{username}</span>
            </div>
          )}

          <button
            ref={buttonRef}
            onClick={() => setShowHistory(prev => !prev)}
            className={styles['notifications-button']}
            aria-label="Notifications"
          >
            <div className="relative">
              <FiBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-1 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="ml-1 hidden sm:inline text-sm">Notifications</span>
          </button>

          <button onClick={onLogout} className={styles['logout-button']}>
            <FiLogOut className="text-base" />
            <span>Logout</span>
          </button>

          {/* History dropdown */}
          {showHistory && (
            <div ref={historyRef} className={styles['history-container']}>
              <table className={styles['history-table']}>
                <thead>
                  <tr>
                    <th scope="col" className={`${styles['history-table-th']} w-1/4`}>
                      <div className={styles['filter-container']}>
                        <select
                          value={order}
                          onChange={handleOrderChange}
                          className={styles['filter-select']}
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
                        <div className="flex items-center gap-2 ml-auto mr-4">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Mark all as read"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {/* Fix #3: use fixed-position popconfirm to avoid scroll */}
                          <button
                            ref={trashButtonRef}
                            onClick={handleClearClick}
                            className={styles['clear-button']}
                            title="Clear History"
                            disabled={alerts.length === 0}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAlerts.map(alert => (
                    <tr
                      key={alert.id}
                      className={`${styles['history-table-tr']} cursor-pointer transition-colors duration-150 ${alert.read ? 'opacity-50 hover:opacity-75' : 'hover:bg-gray-50'}`}
                      onClick={() => handleAlertClick(alert.id, alert.read)}
                    >
                      <td className={`${styles['history-table-td']} font-medium text-center!`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadgeColor(alert.type)}`}>
                            {alert.type}
                          </span>
                        </div>
                      </td>
                      <td className={styles['history-table-td']}>
                        <div className="flex flex-col">
                          <span className="text-gray-800 text-sm">{alert.message}</span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            {new Date(alert.timestamp).toLocaleString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayedAlerts.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-gray-400 text-sm italic">
                        No notifications
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Fix #3: popconfirm rendered at fixed position outside scroll container */}
      {showPopconfirm && (
        <div
          ref={popconfirmRef}
          className="fixed z-[9999] bg-white rounded-xl shadow-xl p-4 border border-gray-200 w-56"
          style={{ top: popconfirmPos.top, right: popconfirmPos.right }}
        >
          <p className="text-sm mb-3 text-gray-700">Clear all notification history?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPopconfirm(false)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
