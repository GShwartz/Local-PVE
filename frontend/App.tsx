import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from './src/Components/Layout/Navbar';
import Footer from './src/Components/Layout/Footer';
import MachinesTable from './src/Components/TableComponents/MachinesTable';
import Login from './src/Components/Login'; // Import Login component
import CreateVMModal from './src/Components/Layout/CreateVMModal';
import Alerts, { Alert } from './src/Components/Alerts';
import { Auth, VM } from './src/types';

const API_BASE = 'http://localhost:8000'; // Backend URL (env var in prod)
const NODE = 'pve'; // Fixed node name

const fetchVMs = async ({ node, csrf, ticket }: { node: string; csrf: string; ticket: string }): Promise<VM[]> => {
  const { data } = await axios.get<VM[]>(`${API_BASE}/vms/${node}`, { params: { csrf_token: csrf, ticket } });
  return data;
};

function App() {
  const [auth, setAuth] = useState<Auth | null>(null);
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

  if (!auth) {
    // Pass setAuth to Login component so it can update the state on successful login
    return <Login onLoginSuccess={setAuth} />;
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
    </>
  );
}

export default App;