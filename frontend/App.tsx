import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from './src/Navbar';
import Footer from './src/Footer';
import MachinesTable from './src/MachinesTable';
import LoginError from './src/LoginError';
import Loading from './src/Loading';

// Define types for API responses and state
interface Credentials {
  username: string;
  password: string;
}

interface Auth {
  ticket: string;
  csrf_token: string;
}

interface VM {
  vmid: number;
  name: string;
  status: string;
  os: string;
  cpus: number;
  ram: number;
  num_hdd: number;
  hdd_sizes: string;
  ip_address: string;
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
  <div className="flex flex-col min-h-screen">
    <div className="flex flex-col items-center justify-center flex-grow w-full">
      <div className="w-full">
        <Navbar />
        <main className="p-8">
          <div className="w-full">
            {vmsError && <p className="text-red-500 mb-4 text-center">Error fetching machines: {vmsError.message}</p>}
            {isLoading && <p className="mb-4 text-gray-400 text-center">Loading...</p>}
            {!isLoading && !vms?.length && <p className="mb-4 text-gray-400 text-center">No machines available.</p>}
            {vms && vms.length > 0 && (
              <MachinesTable vms={vms} auth={auth} queryClient={queryClient} node={NODE} />
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  </div>
);
}

export default App;