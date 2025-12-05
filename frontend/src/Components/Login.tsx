import { useState } from 'react';
import { LoginForm, Auth } from '../types';
import toast from 'react-hot-toast';

interface LoginProps {
  onLoginSuccess: (auth: Auth) => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  // Pre-filled credentials as requested
  const [form, setForm] = useState<LoginForm>({
    username: 'app@pve',
    password: 'Pass12344321!!'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }

      const data: Auth = await response.json();

      // Set Cookies
      document.cookie = `PVEAuthCookie=${data.ticket}; path=/; SameSite=Strict; Secure`;
      document.cookie = `CSRFPreventionToken=${data.csrf_token}; path=/; SameSite=Strict; Secure`;

      localStorage.setItem('csrf_token', data.csrf_token);
      localStorage.setItem('ticket', data.ticket);

      toast.success('Welcome back!');
      onLoginSuccess(data);
    } catch (error: any) {
      console.error('Login error:', error);
      // Extract nice message if json
      let msg = error.message;
      try {
        const json = JSON.parse(msg);
        if (json.detail) msg = json.detail;
      } catch (e) { }

      toast.error(msg || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md p-8 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl z-10 transform transition-all hover:scale-[1.01] hover:shadow-blue-500/10">
        <div className="mb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 01-2 2v4a2 2 0 012 2h14a2 2 0 012-2v-4a2 2 0 01-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Local PVE
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Orchestrate your local infrastructure</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-gray-100 placeholder-gray-500 transition-all"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-gray-100 placeholder-gray-500 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Access Controller'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Authorized personnel only. <br /> System activity is monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;