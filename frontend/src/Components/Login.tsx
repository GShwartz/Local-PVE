// Login.tsx
import { useState } from 'react';
import { LoginForm } from '../types';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Login failed: ' + errorText);
      }

      const { ticket, csrf_token } = await response.json();
      console.log('Login response:', { ticket, csrf_token });
      document.cookie = `PVEAuthCookie=${ticket}; path=/; SameSite=Strict; Secure`;
      document.cookie = `CSRFPreventionToken=${csrf_token}; path=/; SameSite=Strict; Secure`;

      localStorage.setItem('csrf_token', csrf_token);
      localStorage.setItem('ticket', ticket);
      toast.success('Login successful!');
      window.location.reload(); // Reload to ensure auth state is updated
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to log in. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <input
        type="text"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
        placeholder="Username"
        className="border p-2 mb-2 w-full"
      />
      <input
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        placeholder="Password"
        className="border p-2 mb-2 w-full"
      />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Login
      </button>
    </div>
  );
};

export default Login;