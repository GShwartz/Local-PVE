import { useState, useEffect } from 'react';
import { VM } from '../../../../types';

interface NetworkingViewProps {
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
}

interface NetworkInterface {
  name: string; // e.g., net0
  model: string;
  bridge: string;
  macaddr: string;
  firewall: boolean;
  link_down: boolean;
  queues?: number;
  rate?: number;
  tag?: number;
  trunks?: string;
  mtu?: number;
}

const NetworkingView = ({
  vm,
  node,
  auth,
  addAlert,
  refreshVMs
}: NetworkingViewProps) => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworking = async (showAlert = false) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with backend call later
      // const res = await fetch(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/network`, { ... });
      // const data: NetworkInterface[] = await res.json();

      const data: NetworkInterface[] = [
        {
          name: 'net0',
          model: 'virtio',
          bridge: 'vmbr0',
          macaddr: 'DE:AD:BE:EF:00:01',
          firewall: true,
          link_down: false,
          queues: 4,
          rate: 100,
          tag: 100,
          trunks: '200;300',
          mtu: 1500
        }
      ];

      setInterfaces(data);
      if (showAlert) addAlert(`Networking data refreshed for VM ${vm.vmid}`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to load networking data';
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
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-base font-semibold text-gray-900 md:text-xl dark:text-white">
          Networking
        </h5>
        <button
          onClick={handleRefreshClick}
          disabled={loading}
          className={`text-white font-medium rounded-lg text-sm px-3 py-1 text-center ${
            loading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
          }`}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading networking...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && interfaces.length === 0 && (
        <p className="text-sm text-gray-500">No network interfaces found.</p>
      )}

      {!loading && !error && interfaces.length > 0 && (
        <div className="max-h-64 overflow-y-auto">
          <ul className="my-4 space-y-3">
            {interfaces.map((net, idx) => (
              <li
                key={idx}
                className="p-3 text-sm text-gray-900 rounded-lg bg-gray-700 dark:text-white flex flex-col gap-1"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{net.name}</span>
                  <span>{net.model}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-xs">
                  <span>Bridge: {net.bridge}</span>
                  <span>MAC: {net.macaddr}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-xs">
                  <span>Firewall: {net.firewall ? 'Enabled' : 'Disabled'}</span>
                  <span>Link: {net.link_down ? 'Down' : 'Up'}</span>
                </div>
                {net.queues !== undefined && (
                  <div className="flex justify-between text-gray-300 text-xs">
                    <span>Queues: {net.queues}</span>
                    <span>Rate: {net.rate ?? '-'} Mbps</span>
                  </div>
                )}
                {net.tag !== undefined && (
                  <div className="flex justify-between text-gray-300 text-xs">
                    <span>VLAN Tag: {net.tag}</span>
                    <span>Trunks: {net.trunks ?? '-'}</span>
                  </div>
                )}
                {net.mtu !== undefined && (
                  <div className="flex justify-between text-gray-300 text-xs">
                    <span>MTU: {net.mtu}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NetworkingView;
