import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from './src/Components/Layout/Navbar';
import Footer from './src/Components/Layout/Footer';
import MachinesTable from './src/Components/TableComponents/MachinesTable';
import LoginError from './src/Components/LoginError';
import Loading from './src/Components/Loading';
import CreateVMModal from './src/Components/Layout/CreateVMModal';
import ConsoleModal from './src/Components/Layout/ConsoleModal';
import Alerts, { Alert } from './src/Components/Alerts';
import { Auth, VM } from './src/types';

// Define types for API responses and state
interface Credentials {
  username: string;
  password: string;
}

const API_BASE = 'http://localhost:8000'; // Backend URL (env var in prod)
const NODE = 'pve'; // Fixed node name

const fetchVMs = async ({ node, csrf, ticket }: { node: string; csrf: string; ticket: string }): Promise<VM[]> => {
  const { data } = await axios.get<VM[]>(`${API_BASE}/vms/${node}`, { params: { csrf_token: csrf, ticket } });
  return data;
};

function App() {
  const credentials: Credentials = { username: 'app@pve', password: 'Pass12344321!!' }; // Replace with actual credentials
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [isConsoleModalOpen, setIsConsoleModalOpen] = useState(false);
  const [selectedVMId, setSelectedVMId] = useState<number | null>(null);

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
    setIsConsoleModalOpen(true);
    addAlert(`Opening console for VM ${vmid}`, 'info');
  };

  const loginMutation = useMutation({
    mutationFn: async (): Promise<Auth> => {
      const { data } = await axios.post<Auth>(`${API_BASE}/login`, credentials);
      setAuth(data);
      return data;
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Invalid credentials or server error. Check backend logs.';
      console.error('Login failed:', errorMessage);
      setLoginError(errorMessage);
    },
    retry: 0,
  });

  useEffect(() => {
    if (!auth && !loginMutation.isPending && !loginError) {
      loginMutation.mutate();
    }
  }, [auth, loginMutation, loginError]);

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
    return <LoginError error={loginError} onRetry={() => { setLoginError(null); loginMutation.mutate(); }} />;
  }

  if (!auth) {
    return <Loading />;
  }

  return (
    <>
      <Navbar
        onCreateClick={() => setIsCreateModalOpen(true)}
        alertHistory={alertHistory}
      />
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          <Alerts alerts={alerts} dismissAlert={dismissAlert} />
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="w-full">
              {vmsError && <p className="text-red-500 mb-4 text-center">Error fetching machines: {vmsError.message}</p>}
              {isLoading && <p className="mb-4 text-gray-400 text-center">Loading...</p>}
              {!isLoading && !vms?.length && <p className="mb-4 text-gray-400 text-center">No machines available.</p>}
              {vms && vms.length > 0 && (
                <MachinesTable 
                  vms={vms} 
                  auth={auth} 
                  queryClient={queryClient} 
                  node={NODE} 
                  addAlert={addAlert} 
                  openConsole={openConsole}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <Footer />
      <CreateVMModal
        isOpen={isCreateModalOpen}
        closeModal={() => setIsCreateModalOpen(false)}
        auth={auth}
        node={NODE}
        queryClient={queryClient}
        addAlert={addAlert}
      />
      <ConsoleModal
        isOpen={isConsoleModalOpen}
        closeModal={() => {
          setIsConsoleModalOpen(false);
          setSelectedVMId(null);
        }}
        node={NODE}
        vmid={selectedVMId || 0}
        backendUrl={API_BASE}
        auth={auth}
        addAlert={addAlert}
      />
    </>
  );
}

export default App;