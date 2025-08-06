import { NetworkInterface } from './NetworkingView';

const NetworkingItem = ({ net }: { net: NetworkInterface }) => (
  <li className="p-3 text-sm text-gray-900 rounded-lg bg-gray-700 dark:text-white flex flex-col gap-1">
    <div className="flex justify-between">
      <span className="font-semibold">{net.name}</span>
      <span>{net.model}</span>
    </div>
    {net.bridge && (
      <div className="flex justify-between text-gray-300 text-xs">
        <span>Bridge: {net.bridge}</span>
        {net.macaddr && <span>MAC: {net.macaddr}</span>}
      </div>
    )}
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
);

export default NetworkingItem;
