import DiskListItem from './DiskListItem';
import { VM } from '../../types';

interface DiskListProps {
  config: VM['config'] | null;
  vm: VM;
  node: string;
  auth: { csrf_token: string; ticket: string };
  addAlert: (msg: string, type: string) => void;
  refreshVMs: () => void;
  pendingDiskKey: string | null;
  deletingDiskKey: string | null;
  setPendingDiskKey: (key: string | null) => void;
  setDeletingDiskKey: (key: string | null) => void;
  refreshConfig: () => void;
}

const DiskList = ({
  config,
  vm,
  node,
  auth,
  addAlert,
  refreshVMs,
  pendingDiskKey,
  deletingDiskKey,
  setPendingDiskKey,
  setDeletingDiskKey,
  refreshConfig
}: DiskListProps) => {
  if (!config) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">Loading disks...</p>;
  }

  const diskEntries = Object.entries(config)
    .filter(([key, value]) => /^(scsi|sata|virtio|ide)\d+$/.test(key) && typeof value === 'string' && !/media=cdrom/.test(value))
    .sort(([a], [b]) => {
      const ma = a.match(/^([a-z]+)(\d+)$/);
      const mb = b.match(/^([a-z]+)(\d+)$/);
      if (!ma || !mb) return 0;
      if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1]);
      return parseInt(ma[2]) - parseInt(mb[2]);
    });

  if (diskEntries.length === 0) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">No disks found.</p>;
  }

  return (
    <ul className="my-4 space-y-3 max-h-64 overflow-y-auto">
      {diskEntries.map(([key, value], index) => (
        <DiskListItem
          key={index}
          diskKey={key}
          diskValue={value}
          vm={vm}
          node={node}
          auth={auth}
          addAlert={addAlert}
          refreshVMs={refreshVMs}
          pendingDiskKey={pendingDiskKey}
          deletingDiskKey={deletingDiskKey}
          setPendingDiskKey={setPendingDiskKey}
          setDeletingDiskKey={setDeletingDiskKey}
          refreshConfig={refreshConfig}
        />
      ))}
    </ul>
  );
};

export default DiskList;
