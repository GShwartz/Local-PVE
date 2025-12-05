import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from './src/Components/Layout/Navbar';
import Footer from './src/Components/Layout/Footer';
import MachinesTable from './src/Components/TableComponents/MachinesTable';
import LoginError from './src/Components/LoginError';
import Login from './src/Components/Login';
import CreateVMModal from './src/Components/Layout/CreateVMModal';
import Alerts, { Alert } from './src/Components/Alerts';
import { Auth, VM } from './src/types';

// Define types for API responses and state

const API_BASE = 'http://localhost:8000'; // Backend URL (env var in prod)
const NODE = 'pve'; // Fixed node name

const fetchVMs = async ({ node, csrf, ticket }: { node: string; csrf: string; ticket: string }): Promise<VM[]> => {
  const { data } = await axios.get<VM[]>(`${API_BASE}/vms/${node}`, { params: { csrf_token: csrf, ticket } });
  return data;
};

function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [_selectedVMId, setSelectedVMId] = useState<number | null>(null);

  const addAlert = (message: string, type: string): void => {
    const id: string = `${Date.now()}-${Math.random()}`;
    const newAlert = { id, message, type };
    setAlerts((prev) => [...prev, newAlert]);
    setAlertHistory((prev) => [...prev, newAlert]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 5000);
  };

  const dismissAlert = (id: string): void => {
    setAlerts((prevState) => prevState.filter((alert) => alert.id !== id));
  };

  const openConsole = (vmid: number) => {
    setSelectedVMId(vmid);
    addAlert(`Opening console for VM ${vmid}`, 'info');
  };

  const { data: vms, error: vmsError, isLoading } = useQuery({
    queryKey: ['vms', NODE, auth?.csrf_token, auth?.ticket],
    queryFn: () => fetchVMs({ node: NODE, csrf: auth?.csrf_token || '', ticket: auth?.ticket || '' }),
    enabled: !!auth,
  });

  useEffect(() => {
    if (vms) {
      console.log('VMs data:', vms); // Log raw data for debugging
    }
  }, [vms]);

  if (loginError) {
    return <LoginError error={loginError} onRetry={() => setLoginError(null)} />;
  }

  if (!auth) {
    return <Login onLoginSuccess={setAuth} />;
  }

  return (
    <>
      {/* Global Background Ambience */}
      <div className="fixed inset-0 bg-gray-900 -z-20" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none -z-10" />

      <div className="flex flex-col min-h-screen">
        <Navbar
          onCreateClick={() => setIsCreateModalOpen(true)}
          onLogout={() => setAuth(null)}
          alertHistory={alertHistory}
        />

        <div className="flex flex-1 relative z-10">
          <div className="flex-1 flex flex-col">
            <Alerts alerts={alerts} dismissAlert={dismissAlert} />
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full">
              <div className="w-full">
                {vmsError && <p className="text-red-400 mb-4 text-center bg-red-900/20 p-4 rounded-lg border border-red-500/20">Error fetching machines: {vmsError.message}</p>}
                {isLoading && (
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {!isLoading && !vms?.length && (
                  <p className="mb-4 text-gray-400 text-center py-20 bg-gray-800/40 rounded-xl border border-white/5">
                    No machines available. Create one to get started.
                  </p>
                )}
                {vms && vms.length > 0 && (
                  <div className="animate-fade-in-up">
                    <MachinesTable
                      vms={vms!}
                      auth={auth!}
                      queryClient={queryClient}
                      node={NODE}
                      addAlert={addAlert}
                      openConsole={openConsole}
                    />
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
        <Footer />
      </div>

      <CreateVMModal
        isOpen={isCreateModalOpen}
        closeModal={() => setIsCreateModalOpen(false)}
        auth={auth}
        node={NODE}
        queryClient={queryClient}
        addAlert={addAlert}
      />
    </>
  );
}

export default App;