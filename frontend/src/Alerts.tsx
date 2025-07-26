export interface Alert {
  id: string;
  message: string;
  type: string;
}

export interface AlertsProps {
  alerts: Alert[];
  dismissAlert: (id: string) => void;
}

const getAlertStyles = (type: string) => {
  switch (type) {
    case 'success':
      return 'flex items-center p-4 text-green-800 rounded-lg bg-green-50/50 dark:bg-gray-800/50 dark:text-green-400';
    case 'error':
      return 'flex items-center p-4 text-red-800 rounded-lg bg-red-50/50 dark:bg-gray-800/50 dark:text-red-400';
    case 'info':
      return 'flex items-center p-4 text-blue-800 rounded-lg bg-blue-50/50 dark:bg-gray-800/50 dark:text-blue-400';
    case 'warning':
      return 'flex items-center p-4 text-yellow-800 rounded-lg bg-yellow-50/50 dark:bg-gray-800/50 dark:text-yellow-300';
    default:
      return 'flex items-center p-4 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-300';
  }
};

const getButtonStyles = (type: string) => {
  switch (type) {
    case 'success':
      return 'ms-auto -mx-1 -my-1 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1 hover:bg-green-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700';
    case 'error':
      return 'ms-auto -mx-1 -my-1 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1 hover:bg-red-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700';
    case 'info':
      return 'ms-auto -mx-1 -my-1 bg-blue-50 text-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 p-1 hover:bg-blue-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700';
    case 'warning':
      return 'ms-auto -mx-1 -my-1 bg-yellow-50 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1 hover:bg-yellow-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-yellow-300 dark:hover:bg-gray-700';
    default:
      return 'ms-auto -mx-1 -my-1 bg-gray-50 text-gray-500 rounded-lg focus:ring-2 focus:ring-gray-400 p-1 hover:bg-gray-200 inline-flex items-center justify-center h-5 w-5 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';
  }
};

const Alerts = ({ alerts, dismissAlert }: AlertsProps) => {
  return (
    <div className="fixed top-16 right-8 flex flex-col space-y-2 z-50">
      {alerts.map((alert) => (
        <div key={alert.id} className={getAlertStyles(alert.type)} role="alert">
          <svg className="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span className="sr-only">Info</span>
          <div className="ms-3 me-4 text-sm font-medium">
            {alert.message}
          </div>
          <button
            type="button"
            className={getButtonStyles(alert.type)}
            onClick={() => dismissAlert(alert.id)}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default Alerts;