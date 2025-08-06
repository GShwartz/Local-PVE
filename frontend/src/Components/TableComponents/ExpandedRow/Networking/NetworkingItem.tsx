import { NetworkInterface } from './NetworkingView';
import { Copy } from 'lucide-react';

interface NetworkingItemProps {
  net: NetworkInterface;
  onRemove: (name: string) => void;
  onEdit: (nic: NetworkInterface) => void;
  onCopyMac: (mac: string) => void;
}

const NetworkingItem = ({ net, onRemove, onEdit, onCopyMac }: NetworkingItemProps) => (
  <li className="p-3 text-sm text-gray-900 rounded-lg bg-gray-700 dark:text-white flex flex-col gap-1">
    {/* NIC Name and Model */}
    <div className="flex justify-between items-center">
      <div>
        <span className="font-semibold">{net.name}</span>
        <span className="ml-2">{net.model}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(net)}
          className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
        >
          Edit
        </button>
        <button
          onClick={() => onRemove(net.name)}
          className="bg-red-700 hover:bg-red-800 text-white text-xs px-2 py-1 rounded"
        >
          Remove
        </button>
      </div>
    </div>

    {/* MAC Address + Copy Icon */}
    {net.macaddr && (
      <div className="flex items-center justify-between text-gray-300 text-xs">
        <span className="select-none">MAC Address: {net.macaddr}</span>
        <button
          title="Copy MAC"
          onClick={() => onCopyMac(net.macaddr!)}
          className="text-gray-400 hover:text-white"
        >
          <Copy size={16} />
        </button>
      </div>
    )}

    {/* Firewall & Link Status */}
    <div className="flex justify-between text-gray-300 text-xs">
      <span>Firewall: {net.firewall ? 'Enabled' : 'Disabled'}</span>
      <span>Link: {net.link_down ? 'Down' : 'Up'}</span>
    </div>

    {/* Queues & Rate */}
    {net.queues !== undefined && (
      <div className="flex justify-between text-gray-300 text-xs">
        <span>Queues: {net.queues}</span>
        <span>Rate: {net.rate ?? '-'} Mbps</span>
      </div>
    )}

    {/* VLAN Tag & Trunks */}
    {net.tag !== undefined && (
      <div className="flex justify-between text-gray-300 text-xs">
        <span>VLAN Tag: {net.tag}</span>
        <span>Trunks: {net.trunks ?? '-'}</span>
      </div>
    )}

    {/* MTU */}
    {net.mtu !== undefined && (
      <div className="flex justify-between text-gray-300 text-xs">
        <span>MTU: {net.mtu}</span>
      </div>
    )}
  </li>
);

export default NetworkingItem;
