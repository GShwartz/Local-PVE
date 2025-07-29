import { useState, useRef, useEffect } from 'react';
import { Alert } from '../Alerts';

const Navbar = ({ onCreateClick, alertHistory }: { onCreateClick: () => void; alertHistory: Alert[] }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [order, setOrder] = useState<'newToOld' | 'oldToNew'>('newToOld');
  const [alerts, setAlerts] = useState(alertHistory);
  const [showPopconfirm, setShowPopconfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popconfirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAlerts(alertHistory);
  }, [alertHistory]);

  useEffect(() => {
    if (!showHistory && !showPopconfirm) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyRef.current && !historyRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        popconfirmRef.current && !popconfirmRef.current.contains(event.target as Node)
      ) {
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
  };

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 shadow-lg relative z-50">
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold text-white">Local-PVE</span>
          <button onClick={onCreateClick} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md">Create VM</button>
        </div>
        <div className="space-x-6 relative">
          <button
            ref={buttonRef}
            onClick={() => setShowHistory((prev) => !prev)}
            className="inline-block rounded bg-blue-600 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-md transition duration-150 ease-in-out hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg dark:shadow-md dark:hover:shadow-lg dark:focus:shadow-lg dark:active:shadow-lg"
          >
            Notifications
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Logout</button>
          {showHistory && (
            <div
              ref={historyRef}
              className="absolute top-12 right-0 w-[500px] max-h-80 overflow-y-auto bg-gray-900/70 rounded-lg shadow-2xl p-4 custom-scrollbar z-[100] text-surface dark:text-white"
            >
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <select
                          value={order}
                          onChange={handleOrderChange}
                          className="bg-gray-700 text-white rounded p-1 text-sm border-none"
                        >
                          <option value="newToOld">Newer</option>
                          <option value="oldToNew">Older</option>
                        </select>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <span>Message</span>
                        <div className="relative">
                          <button
                            onClick={() => setShowPopconfirm(true)}
                            className="text-red-400 hover:text-red-500"
                            title="Clear History"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M9 7v12m6-12v12M3 3h18" />
                            </svg>
                          </button>
                          {showPopconfirm && (
                            <div
                              ref={popconfirmRef}
                              className="absolute top-6 right-0 bg-gray-800 text-white rounded-lg shadow-lg p-4 z-[200] border border-gray-600"
                            >
                              <p className="text-sm mb-3">Are you sure you want to clear the history?</p>
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => setShowPopconfirm(false)}
                                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleClearHistory}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAlerts.map((alert) => (
                    <tr key={alert.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className={`px-6 py-4 font-medium ${getTextColor(alert.type)}`}>{alert.type}</td>
                      <td className="px-6 py-4">{alert.message}</td>
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