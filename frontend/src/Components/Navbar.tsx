// Navbar.tsx
import { useState, useRef, useEffect } from 'react';
import { Alert } from './Alerts';

const Navbar = ({ onCreateClick, alertHistory }: { onCreateClick: () => void; alertHistory: Alert[] }) => {
  const [showHistory, setShowHistory] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLUListElement>(null);

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

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 shadow-lg relative">
      <div className="container mx-auto flex justify-between items-center">
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
            <ul
              ref={historyRef}
              className="absolute right-0 mt-2 w-[500px] max-h-40 overflow-y-auto bg-gray-800 rounded-lg shadow-lg p-4 custom-scrollbar z-50 text-surface dark:text-white"
            >
              {alertHistory.slice().reverse().map((alert) => (
                <li
                  key={alert.id}
                  className={`w-full border-b-2 border-neutral-100 py-2 dark:border-white/10 last:border-b-0 flex items-center ${
                    alert.type === 'success' ? 'text-green-400' :
                    alert.type === 'error' ? 'text-red-400' :
                    alert.type === 'info' ? 'text-blue-400' :
                    alert.type === 'warning' ? 'text-yellow-300' :
                    'text-gray-300'
                  }`}
                >
                  <svg className="shrink-0 w-4 h-4 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
                  </svg>
                  {alert.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;