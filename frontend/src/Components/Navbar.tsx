import { useState, useRef, useEffect } from 'react';
import { Alert } from './Alerts';

const Navbar = ({ onCreateClick, alertHistory }: { onCreateClick: () => void; alertHistory: Alert[] }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [order, setOrder] = useState<'newToOld' | 'oldToNew'>('newToOld');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHistory) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyRef.current && !historyRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  const getTextColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'warning': return 'text-yellow-300';
      default: return 'text-gray-300';
    }
  };

  let displayedAlerts = [...alertHistory];
  if (order === 'newToOld') {
    displayedAlerts = displayedAlerts.slice().reverse();
  }

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrder(e.target.value as 'newToOld' | 'oldToNew');
    e.target.blur(); // Remove focus after selection
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
              className="absolute top-12 right-0 w-[500px] max-h-80 overflow-y-auto bg-gray-900 rounded-lg shadow-2xl p-4 custom-scrollbar z-[100] text-surface dark:text-white"
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
                    <th scope="col" className="px-6 py-3">Message</th>
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