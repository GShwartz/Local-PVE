import { NetworkInterface } from './NetworkingView';
import NetworkingItem from './NetworkingItem';
import styles from '../../../../CSS/ExpandedArea.module.css';

interface NetworkingListProps {
  interfaces: NetworkInterface[];
  onRemove: (name: string) => void;
  onEdit: (nic: NetworkInterface) => void;
  onCopyMac: (mac: string) => void;
  vmStatus: string;
  ipAddress?: string;
}

const NetworkingList = ({
  interfaces,
  onRemove,
  onEdit,
  onCopyMac,
  vmStatus,
  ipAddress
}: NetworkingListProps) => (
  <div className={styles.column}>
    <div className="max-h-64 overflow-y-auto">
      <ul className="my-4 space-y-3">
        {interfaces.map((net) => (
          <NetworkingItem
            key={net.name}
            net={net}
            onRemove={onRemove}
            onEdit={onEdit}
            onCopyMac={onCopyMac}
            vmStatus={vmStatus}
            ipAddress={net.name === 'net0' ? ipAddress : undefined}
          />
        ))}
      </ul>
    </div>
  </div>
);

export default NetworkingList;
