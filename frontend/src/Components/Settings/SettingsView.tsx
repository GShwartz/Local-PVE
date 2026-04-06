import { useState, type ReactNode } from 'react';
import { Server, Database, ShieldAlert, Save, RefreshCw, Check, type LucideIcon } from 'lucide-react';

interface SettingsViewProps {
  addAlert: (message: string, type: string) => void;
}

const Section = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
      <Icon size={16} className="text-blue-500" />
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Field = ({
  label, description, children,
}: { label: string; description?: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-8 py-3 border-b border-gray-50 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const SettingsView = ({ addAlert }: SettingsViewProps) => {
  const [proxmoxHost, setProxmoxHost] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('proxmox_host') || 'pve.home.lab' : 'pve.home.lab'
  );
  const [proxmoxPort, setProxmoxPort] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('proxmox_port') || '8006' : '8006'
  );
  const [verifySSL, setVerifySSL] = useState(false);
  const [refetchInterval, setRefetchInterval] = useState('2000');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('proxmox_host', proxmoxHost);
    localStorage.setItem('proxmox_port', proxmoxPort);
    addAlert('Settings saved to local storage. Restart the app to apply.', 'info');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade-in-up max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">Application and connection configuration</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white rounded-lg text-sm font-semibold transition-colors
                     shadow-sm shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
        >
          {saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save Changes</>}
        </button>
      </div>

      {/* Proxmox connection */}
      <Section title="Proxmox Connection" icon={Server}>
        <Field label="Proxmox Host" description="Hostname or IP address of the Proxmox server">
          <input
            type="text"
            value={proxmoxHost}
            onChange={e => setProxmoxHost(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-48
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          />
        </Field>
        <Field label="Proxmox Port" description="API port (default: 8006)">
          <input
            type="text"
            value={proxmoxPort}
            onChange={e => setProxmoxPort(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-28
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          />
        </Field>
        <Field label="Verify SSL Certificate" description="Disable for self-signed certificates">
          <button
            onClick={() => setVerifySSL(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${verifySSL ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                              ${verifySSL ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </Field>
      </Section>

      {/* Dashboard */}
      <Section title="Dashboard" icon={RefreshCw}>
        <Field label="VM Refresh Interval" description="How often to poll Proxmox for VM status (milliseconds)">
          <select
            value={refetchInterval}
            onChange={e => setRefetchInterval(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          >
            <option value="1000">1 second</option>
            <option value="2000">2 seconds</option>
            <option value="5000">5 seconds</option>
            <option value="10000">10 seconds</option>
          </select>
        </Field>
      </Section>

      {/* Database */}
      <Section title="Database" icon={Database}>
        <Field
          label="Database URL"
          description="Connection string — configured via backend .env file"
        >
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200">
            postgresql+asyncpg://…
          </span>
        </Field>
        <Field
          label="Tables"
          description="Managed automatically by SQLAlchemy on startup"
        >
          <div className="flex flex-wrap gap-1.5">
            {['app_users', 'audit_log', 'vm_metadata', 'user_sessions', 'disk_metadata'].map(t => (
              <span key={t} className="text-xs font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                {t}
              </span>
            ))}
          </div>
        </Field>
      </Section>

      {/* About */}
      <Section title="About" icon={ShieldAlert}>
        <Field label="Application" description="Proxmox VE management dashboard">
          <span className="text-sm font-semibold text-gray-700">Local-PVE</span>
        </Field>
        <Field label="Version">
          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
            v1.0.0
          </span>
        </Field>
        <Field label="Author">
          <a
            href="https://gilshwartz.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Gil Shwartz
          </a>
        </Field>
      </Section>
    </div>
  );
};

export default SettingsView;
