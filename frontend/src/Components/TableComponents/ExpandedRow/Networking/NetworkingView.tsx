import { useState, useEffect } from 'react';
import axios from 'axios';
import { VM, VMConfigResponse, ProxmoxVMConfig } from '../../../../types';
import styles from '../../../../CSS/ExpandedArea.module.css';
import NetworkingHeader from './NetworkingHeader';
import NetworkingList from './NetworkingList';
import NetworkingModal, { NetworkingFormData } from './NetworkingModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNIC, setEditNIC] = useState<NetworkInterface | null>(null);

  const API_BASE = 'http://localhost:8000';

  const parseNetConfig = (key: string, value: string): NetworkInterface => {
    const parts = value.split(',');
    let model = '';
    let macaddr = '';

    if (parts[0].includes('=')) {
      const [m, mac] = parts[0].split('=');
      model = m.trim();
      macaddr = mac.trim();
    } else {
      model = parts[0].trim();
    }

    const params = parts.slice(1).reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.includes('=') ? part.split('=') : [part, 'true'];
      acc[k.trim()] = v.trim();
      return acc;
    }, {});

    return {
      name: key,
      model,
      macaddr,
      bridge: params.bridge,
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

  const handleAddNIC = () => {
    setEditNIC(null);
    setIsModalOpen(true);
  };

  const handleNICSubmit = async (data: NetworkingFormData) => {
    const nicIndex = editNIC
      ? Number(editNIC.name.replace('net', ''))
      : interfaces.length;

    const nicKey = `net${nicIndex}`;
    const parts = [`${data.model}=${data.macaddr}`];

    if (data.firewall) parts.push('firewall=1');
    if (data.link_down) parts.push('link_down=1');
    if (data.tag !== undefined) parts.push(`tag=${data.tag}`);
    parts.push('bridge=vmbr0');

    const config = { [nicKey]: parts.join(',') };

    try {
      if (editNIC) {
        await axios.delete(`${API_BASE}/vm/${node}/qemu/${vm.vmid}/network`, {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
            nic: nicKey
          }
        });
      }

      await axios.put(
        `${API_BASE}/vm/${node}/qemu/${vm.vmid}/network`,
        config,
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket
          }
        }
      );

      addAlert(`${editNIC ? 'Updated' : 'Added'} NIC ${nicKey}`, 'success');
      fetchNetworking(true);
      refreshVMs();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      addAlert(`Failed to ${editNIC ? 'edit' : 'add'} NIC: ${msg}`, 'error');
    } finally {
      setIsModalOpen(false);
      setEditNIC(null);
    }
  };

  const handleRemoveNIC = async (nicName: string) => {
    try {
      await axios.delete(
        `${API_BASE}/vm/${node}/qemu/${vm.vmid}/network`,
        {
          params: {
            csrf_token: auth.csrf_token,
            ticket: auth.ticket,
            nic: nicName
          }
        }
      );
      addAlert(`Removed NIC ${nicName}`, 'success');
      fetchNetworking(true);
      refreshVMs();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      addAlert(`Failed to remove NIC ${nicName}: ${msg}`, 'error');
    }
  };
  const handleEditNIC = (nic: NetworkInterface) => {
    setEditNIC(nic);
    setIsModalOpen(true);
  };

  const handleCopyMac = (mac: string) => {
    navigator.clipboard.writeText(mac).then(() => {
      addAlert(`Copied MAC address: ${mac}`, 'success');
    });
  };

  return (
    <div className="w-full flex-1 min-h-[300px] max-h-[600px] overflow-y-auto p-4 bg-white border border-gray-200 rounded-lg shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      <div className={styles.cardHeader}>
        <h5 className={styles.cardTitle}>Networking</h5>
        <NetworkingHeader
          loading={loading}
          onRefresh={handleRefreshClick}
          onAddNIC={handleAddNIC}
          vmStatus={vm.status}
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading networking...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && interfaces.length === 0 && (
        <p className="text-sm text-gray-500">No network interfaces found.</p>
      )}
      {!loading && !error && interfaces.length > 0 && (
        <NetworkingList
          interfaces={interfaces}
          onRemove={handleRemoveNIC}
          onEdit={handleEditNIC}
          onCopyMac={handleCopyMac}
          vmStatus={vm.status}
          ipAddress={vm.ip_address}
        />
      )}

      <NetworkingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNICSubmit}
        editNIC={editNIC}
      />
    </div>
  );
};

export default NetworkingView;
