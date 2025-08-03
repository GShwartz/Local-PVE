import axios from 'axios';
import { VM } from '../../types';

interface DiskListItemProps {
  diskKey: string;
  diskValue: string;
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

const DiskListItem = ({
  diskKey,
  diskValue,
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
}: DiskListItemProps) => {
  const controller = diskKey.replace(/\d+$/, '') || 'unknown';
  const controllerLabel = controller.toUpperCase();
  const controllerNumber = diskKey.match(/\d+$/)?.[0];
  const sizeMatch = diskValue.match(/size=(\d+[KMGTP]?)/);
  const size = sizeMatch ? sizeMatch[1] : 'unknown';
  const isPending = pendingDiskKey === diskKey;
  const isDeleting = deletingDiskKey === diskKey;
  const isBootDisk = diskKey === 'scsi0';

  const confirmRemoveDisk = async () => {
    setDeletingDiskKey(diskKey);
    addAlert(`Removing disk ${diskKey} from VM ${vm.vmid} on node ${node}...`, 'info');

    try {
      if (vm.status === 'running') {
        addAlert(`VM ${vm.vmid} is running. Sending shutdown before disk removal...`, 'info');
        await axios.post(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/shutdown`, {
          csrf_token: auth.csrf_token,
          ticket: auth.ticket
        });
        await new Promise((res) => setTimeout(res, 3000));
      }

      await axios.delete(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}`, {
        params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
        headers: { 'Content-Type': 'application/json' }
      });

      addAlert(`✅ Disk ${diskKey} removed successfully from VM ${vm.vmid}.`, 'success');
      await refreshConfig();
      refreshVMs(); // ← Ensures TableRow is updated
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      addAlert(`❌ Failed to remove disk ${diskKey}: ${detail}`, 'error');
    } finally {
      setPendingDiskKey(null);
      setDeletingDiskKey(null);
    }
  };

  return (
    <li>
      <div className="flex items-center justify-between p-3 text-sm font-normal text-gray-900 rounded-lg bg-gray-700 dark:bg-gray-700 dark:text-white">
        <div className="flex items-center space-x-4">
          <span className="text-[16px] font-semibold">💾 {controllerLabel} {controllerNumber}</span>
          <span className="text-base font-medium text-gray-200">{size}</span>
        </div>
        {isPending ? (
          isDeleting ? (
            <span className="text-xs text-gray-400">Removing...</span>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-red-300">
                {vm.status === 'running' ? 'Shutdown + Remove?' : 'Confirm remove?'}
              </span>
              <button onClick={confirmRemoveDisk} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded">
                Yes
              </button>
              <button onClick={() => setPendingDiskKey(null)} className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded">
                No
              </button>
            </div>
          )
        ) : (
          <button
            onClick={() => setPendingDiskKey(diskKey)}
            disabled={isBootDisk || pendingDiskKey !== null || deletingDiskKey === diskKey}
            className={`text-xs px-2 py-1 rounded-md focus:outline-none ${
              isBootDisk || pendingDiskKey !== null || deletingDiskKey === diskKey
                ? 'bg-gray-600 text-white cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-400'
            }`}
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
};

export default DiskListItem;
