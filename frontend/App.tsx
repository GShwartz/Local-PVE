import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from './src/Components/Layout/Navbar';
import Sidebar, { Page } from './src/Components/Layout/Sidebar';
import MachinesTable from './src/Components/TableComponents/MachinesTable';
import LoginError from './src/Components/LoginError';
import Login from './src/Components/Login';
import CreateVMModal from './src/Components/Layout/CreateVMModal';
import CreateK8sModal from './src/Components/Layout/CreateK8sModal';
import DeployAppModal from './src/Components/Layout/DeployAppModal';
import Alerts, { Alert } from './src/Components/Alerts';
import UserManagementView from './src/Components/UserManagement/UserManagementView';
import AuditLogView from './src/Components/AuditLog/AuditLogView';
import SettingsView from './src/Components/Settings/SettingsView';
import IntegrationsView from './src/Components/Integrations/IntegrationsView';
import { Auth, VM } from './src/types';

const API_BASE = 'http://localhost:8000';
const NODE = 'pve';

const pageTitles: Record<Page, string> = {
  dashboard:    'Dashboard',
  users:        'User Management',
  audit:        'Audit Log',
  integrations: 'Integrations',
  settings:     'Settings',
};

const fetchVMs = async ({ node, csrf, ticket }: { node: string; csrf: string; ticket: string }): Promise<VM[]> => {
  const { data } = await axios.get<VM[]>(`${API_BASE}/vms/${node}`, { params: { csrf_token: csrf, ticket } });
  return data;
};

function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isCreateModalOpen,    setIsCreateModalOpen]    = useState(false);
  const [isCreateK8sModalOpen, setIsCreateK8sModalOpen] = useState(false);
  const [isDeployAppModalOpen, setIsDeployAppModalOpen] = useState(false);

  const closeAllModals = () => {
    setIsCreateModalOpen(false);
    setIsCreateK8sModalOpen(false);
    setIsDeployAppModalOpen(false);
  };
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [_selectedVMId, setSelectedVMId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Restore auth from localStorage on mount (survives backend restarts + page refreshes)
  useEffect(() => {
    const ticket     = localStorage.getItem('ticket');
    const csrf_token = localStorage.getItem('csrf_token');
    if (ticket && csrf_token) {
      const username = localStorage.getItem('username') ?? undefined;
      const role     = (localStorage.getItem('role') as Auth['role']) ?? 'admin';
      setAuth({ ticket, csrf_token, username, role });
    }
  }, []);

  const role = auth?.role ?? 'admin';

  // Redirect to dashboard if current page is inaccessible for the role
  useEffect(() => {
    const restricted = role === 'viewer'
      ? ['users', 'audit', 'settings']
      : role === 'operator'
        ? ['users', 'audit', 'settings']
        : [];
    if (restricted.includes(activePage)) setActivePage('dashboard');
  }, [role]);

  const addAlert = (message: string, type: string): void => {
    const id = `${Date.now()}-${Math.random()}`;
    const newAlert = { id, message, type, read: false, timestamp: Date.now() };
    setAlerts(prev => [...prev, newAlert]);
    setAlertHistory(prev => [...prev, newAlert]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 5000);
  };

  const markAsRead    = (id: string) => setAlertHistory(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  const markAllAsRead = ()           => setAlertHistory(prev => prev.map(a => ({ ...a, read: true })));
  const dismissAlert  = (id: string) => setAlerts(prev => prev.filter(a => a.id !== id));

  const openConsole = (vmid: number) => {
    setSelectedVMId(vmid);
    addAlert(`Opening console for VM ${vmid}`, 'info');
  };

  const { data: vms, error: vmsError, isLoading } = useQuery({
    queryKey: ['vms', NODE, auth?.csrf_token, auth?.ticket],
    queryFn: () => fetchVMs({ node: NODE, csrf: auth?.csrf_token || '', ticket: auth?.ticket || '' }),
    enabled: !!auth,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (vms) console.log('VMs data:', vms);
  }, [vms]);

  if (loginError) return <LoginError error={loginError} onRetry={() => setLoginError(null)} />;

  if (!auth) {
    return (
      <Login onLoginSuccess={authData => {
        console.log('Login success:', authData);
        setAuth(authData);
      }} />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* ── TopBar ── */}
      <div className="flex-shrink-0">
        <Navbar
          username={auth.username}
          onLogout={() => {
            ['ticket', 'csrf_token', 'username', 'role'].forEach(k => localStorage.removeItem(k));
            setAuth(null);
          }}
          alertHistory={alertHistory}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          onNavigateDashboard={() => setActivePage('dashboard')}
        />
      </div>

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={page => { closeAllModals(); setActivePage(page); }}
          onCreateClick={() => { closeAllModals(); setIsCreateModalOpen(true); }}
          onCreateLXCClick={() => { closeAllModals(); addAlert('Create LXC Container — coming soon.', 'info'); }}
          onCreateK8sClick={() => { closeAllModals(); setIsCreateK8sModalOpen(true); }}
          onDeployAppClick={() => { closeAllModals(); setIsDeployAppModalOpen(true); }}
          role={role}
          isOpen={sidebarOpen}
          pageTitle={pageTitles[activePage]}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative">
          {/* Floating alerts */}
          <Alerts alerts={alerts} dismissAlert={dismissAlert} />

          <div className="p-6 min-h-full">
            {/* ── Dashboard ── */}
            {activePage === 'dashboard' && (
              <>
                {vmsError && (
                  <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm">
                    Error fetching machines: {vmsError.message}
                  </div>
                )}
                {isLoading && (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                  </div>
                )}
                {!isLoading && !vms?.length && (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <p className="text-sm">No machines available. Create one to get started.</p>
                  </div>
                )}
                {vms && vms.length > 0 && (
                  <div className="animate-fade-in-up">
                    <MachinesTable
                      vms={vms}
                      auth={auth}
                      queryClient={queryClient}
                      node={NODE}
                      addAlert={addAlert}
                      openConsole={openConsole}
                    />
                  </div>
                )}
              </>
            )}

            {/* ── User Management ── */}
            {activePage === 'users' && role === 'admin' && (
              <UserManagementView addAlert={addAlert} />
            )}

            {/* ── Audit Log ── */}
            {activePage === 'audit' && role === 'admin' && (
              <AuditLogView />
            )}

            {/* ── Integrations ── */}
            {activePage === 'integrations' && role === 'admin' && (
              <IntegrationsView addAlert={addAlert} />
            )}

            {/* ── Settings ── */}
            {activePage === 'settings' && role === 'admin' && (
              <SettingsView addAlert={addAlert} auth={auth} />
            )}
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      <CreateVMModal
        isOpen={isCreateModalOpen}
        closeModal={() => setIsCreateModalOpen(false)}
        auth={auth}
        node={NODE}
        queryClient={queryClient}
        addAlert={addAlert}
        onNavigateToCloudInit={() => { setIsCreateModalOpen(false); setActivePage('integrations'); }}
      />
      <CreateK8sModal
        isOpen={isCreateK8sModalOpen}
        closeModal={() => setIsCreateK8sModalOpen(false)}
        node={NODE}
        addAlert={addAlert}
      />
      <DeployAppModal
        isOpen={isDeployAppModalOpen}
        closeModal={() => setIsDeployAppModalOpen(false)}
        node={NODE}
        auth={auth}
        queryClient={queryClient}
        addAlert={addAlert}
      />
    </div>
  );
}

export default App;
