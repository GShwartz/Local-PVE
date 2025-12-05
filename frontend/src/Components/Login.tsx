// Login.tsx
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Auth, LoginForm } from '../types';

interface LoginProps {
  onLoginSuccess: (authData: Auth) => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  // Hardcoded credentials for now as requested
  const [form, setForm] = useState<LoginForm>({
    username: 'app@pve',
    password: 'Pass12344321!!'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Using axios to match App.tsx patterns
      const { data } = await axios.post<Auth>('http://localhost:8000/login', form);

      // Set cookies for legacy support if needed (App.tsx seems to use state mainly, but keeping this doesn't hurt)
      document.cookie = `PVEAuthCookie=${data.ticket}; path=/; SameSite=Strict; Secure`;
      document.cookie = `CSRFPreventionToken=${data.csrf_token}; path=/; SameSite=Strict; Secure`;

      localStorage.setItem('csrf_token', data.csrf_token);
      localStorage.setItem('ticket', data.ticket);

      toast.success('Welcome back!');
      onLoginSuccess(data);
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.detail || error.message || 'Failed to log in.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-gray-800/40 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10 animate-fade-in-up">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-sm">Enter your credentials to access the console</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Username</label>
            <div className="relative group">
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-gray-600 group-hover:border-gray-600"
                placeholder="username@realm"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder-gray-600 group-hover:border-gray-600"
                placeholder="••••••••"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            <span className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
              Sign In
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;