import { NetworkInterface } from './NetworkingView';
import NetworkingItem from './NetworkingItem';

const NetworkingList = ({ interfaces }: { interfaces: NetworkInterface[] }) => (
  <div className="max-h-64 overflow-y-auto">
    <ul className="my-4 space-y-3">
      {interfaces.map((net) => (
        <NetworkingItem key={net.name} net={net} />
      ))}
    </ul>
  </div>
);

export default NetworkingList;
