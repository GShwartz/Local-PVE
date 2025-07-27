interface LoginErrorProps {
  error: string;
  onRetry: () => void;
}

const LoginError = ({ error, onRetry }: LoginErrorProps) => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="p-8 bg-gray-800 rounded shadow-md">
        <h1 className="text-2xl mb-4 text-red-500">Login Failed</h1>
        <p>{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white"
          onClick={onRetry}
        >
          Retry Login
        </button>
      </div>
    </div>
  );
};

export default LoginError;