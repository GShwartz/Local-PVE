import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Server } from 'lucide-react';
import { Auth, LoginForm } from '../types';

interface LoginProps {
  onLoginSuccess: (authData: Auth) => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  const [form, setForm] = useState<LoginForm>({ username: 'app@pve', password: 'Pass12344321!!' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await api.post<Auth>('/login', form);

      document.cookie = `PVEAuthCookie=${data.ticket}; path=/; SameSite=Strict; Secure`;
      document.cookie = `CSRFPreventionToken=${data.csrf_token}; path=/; SameSite=Strict; Secure`;
      localStorage.setItem('csrf_token', data.csrf_token);
      localStorage.setItem('ticket', data.ticket);
      localStorage.setItem('username', form.username);
      localStorage.setItem('role', data.role ?? 'admin');
      if (data.user_dir) localStorage.setItem('user_dir', data.user_dir);

      toast.success('Welcome back!');
      onLoginSuccess({ ...data, username: form.username, role: data.role ?? 'admin' });
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.message || 'Failed to log in.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      {/* Login card */}
      <div className="w-full max-w-sm mx-4 relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 mb-4">
            <Server size={26} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Local-PVE</h1>
          <p className="text-gray-500 text-sm">Sign in to your management console</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-200 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                           transition-colors placeholder-gray-400 bg-white"
                placeholder="username@realm"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                           transition-colors placeholder-gray-400 bg-white"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                         text-white font-semibold py-2.5 rounded-lg transition-colors duration-150
                         shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              <span className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                Sign In
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 Local-PVE by Gil Shwartz
        </p>
      </div>
    </div>
  );
};

export default Login;
