import { NetworkInterface } from './NetworkingView';
import NetworkingItem from './NetworkingItem';

interface NetworkingListProps {
  interfaces: NetworkInterface[];
  onRemove: (name: string) => void;
  onEdit: (nic: NetworkInterface) => void;
  onCopyMac: (mac: string) => void;
}

const NetworkingList = ({ interfaces, onRemove, onEdit, onCopyMac }: NetworkingListProps) => (
  <div className="max-h-64 overflow-y-auto">
    <ul className="my-4 space-y-3">
      {interfaces.map((net) => (
        <NetworkingItem
          key={net.name}
          net={net}
          onRemove={onRemove}
          onEdit={onEdit}
          onCopyMac={onCopyMac}
        />
      ))}
    </ul>
  </div>
);

export default NetworkingList;
