import { useState, useEffect } from 'react';
import axios from 'axios';
import { VM, VMConfigResponse, ProxmoxVMConfig } from '../../../../types';
import NetworkingHeader from './NetworkingHeader';
import NetworkingList from './NetworkingList';

export interface NetworkInterface {
  name: string;
  model: string;
  bridge?: string;
  macaddr?: string;
  firewall?: boolean;
  link_down?: boolean;
  queues?: number;
  rate?: number;
  tag?: number;
  trunks?: string;
  mtu?: number;
}

interface NetworkingViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
}

const NetworkingView = ({ vm, node, auth, addAlert, refreshVMs }: NetworkingViewProps) => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = 'http://localhost:8000';

  const parseNetConfig = (key: string, value: string): NetworkInterface => {
    const params = value.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.includes('=') ? part.split('=') : [part, 'true'];
      acc[k.trim()] = v.trim();
      return acc;
    }, {});
    return {
      name: key,
      model: Object.keys(params)[0] || '',
      bridge: params.bridge,
      macaddr: params.macaddr,
      firewall: params.firewall === '1' || params.firewall?.toLowerCase() === 'true',
      link_down: params.link_down === '1' || params.link_down?.toLowerCase() === 'true',
      queues: params.queues ? Number(params.queues) : undefined,
      rate: params.rate ? Number(params.rate) : undefined,
      tag: params.tag ? Number(params.tag) : undefined,
      trunks: params.trunks,
      mtu: params.mtu ? Number(params.mtu) : undefined
    };
  };

  const fetchNetworking = async (showAlert = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<VMConfigResponse>(
        `${API_BASE}/vm/${node}/qemu/${vm.vmid}/config`,
        { params: { csrf_token: auth.csrf_token, ticket: auth.ticket } }
      );

      const config: ProxmoxVMConfig = res.data.config;
      const nets = Object.entries(config)
        .filter(([k]) => /^net\d+$/i.test(k))
        .map(([k, v]) => parseNetConfig(k, String(v)));

      setInterfaces(nets);
      if (showAlert) addAlert(`Networking data refreshed for VM ${vm.vmid}`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to fetch networking';
      setError(msg);
      addAlert(`Error fetching networking for VM ${vm.vmid}: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworking();
  }, [vm.vmid, node, auth]);

  const handleRefreshClick = () => {
    fetchNetworking(true);
    refreshVMs();
  };

  return (
    <div className="w-full flex-1 min-h-[300px] p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      <NetworkingHeader loading={loading} onRefresh={handleRefreshClick} />
      {loading && <p className="text-sm text-gray-500">Loading networking...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && interfaces.length === 0 && (
        <p className="text-sm text-gray-500">No network interfaces found.</p>
      )}
      {!loading && !error && interfaces.length > 0 && <NetworkingList interfaces={interfaces} />}
    </div>
  );
};

export default NetworkingView;
