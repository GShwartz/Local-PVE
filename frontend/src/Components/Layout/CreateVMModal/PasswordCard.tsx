import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordCardProps {
  onPasswordChange: (password: string, isValid: boolean) => void;
}

const PasswordCard = ({ onPasswordChange }: PasswordCardProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (password && confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match');
      onPasswordChange(password, false);
    } else {
      setError('');
      onPasswordChange(password, password.length > 0);
    }
  }, [password, confirmPassword]);

  const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300';
  const cardTitle = 'text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2';
  const fieldBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border-gray-200 shadow-sm';

  return (
    <div className={cardCls}>
      <p className={cardTitle}><Lock size={14}/>Credentials</p>
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Root/Admin Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldBase}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Verify Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${fieldBase} ${error ? 'border-red-300 bg-red-50/30' : ''}`}
            placeholder="••••••••"
          />
          {error && <p className="mt-1.5 text-[10px] text-red-500 font-bold ml-1">{error}</p>}
          {!error && password && confirmPassword && (
            <p className="mt-1.5 text-[10px] text-emerald-500 font-bold ml-1 flex items-center gap-1">
              <ShieldCheck size={10} /> Passwords match
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordCard;
