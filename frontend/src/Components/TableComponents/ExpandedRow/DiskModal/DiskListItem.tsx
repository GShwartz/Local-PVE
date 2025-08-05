import axios from 'axios';
import { VM } from '../../../../types';
import { useState, useRef, useEffect } from 'react';
import DiskExpandModal from './DiskExpandModal';

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
  hasSnapshots: boolean;
  isOnlyDisk: boolean;
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
  refreshConfig,
  hasSnapshots,
  isOnlyDisk
}: DiskListItemProps) => {
  const controller = diskKey.replace(/\d+$/, '') || 'unknown';
  const controllerLabel = controller.toUpperCase();
  const controllerNumber = diskKey.match(/\d+$/)?.[0];
  const sizeMatch = diskValue.match(/size=(\d+[KMGTP]?)/);
  const size = sizeMatch ? sizeMatch[1] : 'unknown';
  const currentSizeGB = parseInt(sizeMatch ? sizeMatch[1].replace(/[^\d]/g, '') : '0', 10);

  const isPending = pendingDiskKey === diskKey;
  const isDeleting = deletingDiskKey === diskKey;
  const isBootDisk = diskKey === 'scsi0';

  const [isExpandModalOpen, setIsExpandModalOpen] = useState(false);

  const confirmRemoveDisk = async () => {
    setDeletingDiskKey(diskKey);
    addAlert(`Removing disk ${diskKey} from VM ${vm.vmid} on node ${node}...`, 'info');

    try {
      if (vm.status === 'running') {
        addAlert(`VM ${vm.vmid} is running. Sending shutdown before disk removal...`, 'info');
        await axios.post(
          `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/shutdown`,
          null,
          {
            params: {
              csrf_token: auth.csrf_token,
              ticket: auth.ticket
            }
          }
        );
      }

      await axios.delete(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}`, {
        params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
        headers: { 'Content-Type': 'application/json' }
      });

      addAlert(`✅ Disk ${diskKey} removed successfully from VM ${vm.vmid}.`, 'success');
      await refreshConfig();
      refreshVMs();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      addAlert(`❌ Failed to remove disk ${diskKey}: ${detail}`, 'error');
    } finally {
      setPendingDiskKey(null);
      setDeletingDiskKey(null);
    }
  };

  const disableRemove = isBootDisk || pendingDiskKey !== null || deletingDiskKey === diskKey || hasSnapshots || isOnlyDisk;

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableRemove) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 30,
        left: rect.left + rect.width / 2
      });

      if (hasSnapshots) {
        setTooltipMessage('Remove option is disabled while there is an active snapshot');
        hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
      } else if (isOnlyDisk) {
        setTooltipMessage('Cannot remove the only disk');
        hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
      }
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <li>
      <div className="flex items-center justify-between p-3 text-sm font-normal text-gray-900 rounded-lg bg-gray-700 dark:bg-gray-700 dark:text-white relative">
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
          <div className="flex items-center space-x-2">
            {/* Expand Button */}
            <button
              onClick={() => setIsExpandModalOpen(true)}
              disabled={pendingDiskKey !== null || deletingDiskKey !== null}
              className="text-xs px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-400"
            >
              Expand
            </button>

            {/* Remove Button */}
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setPendingDiskKey(diskKey)}
                disabled={disableRemove}
                className={`text-xs px-2 py-1 rounded-md focus:outline-none ${
                  disableRemove
                    ? 'bg-gray-600 text-white cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-400'
                }`}
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {showTooltip && (
        <div
          className="note-tooltip show"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
        >
          {tooltipMessage}
        </div>
      )}

      {/* Expand Modal */}
      <DiskExpandModal
        vm={vm}
        node={node}
        auth={auth}
        diskKey={diskKey}
        currentSize={currentSizeGB}
        isOpen={isExpandModalOpen}
        onClose={() => setIsExpandModalOpen(false)}
        addAlert={addAlert}
        refreshConfig={refreshConfig}
      />
    </li>
  );
};

export default DiskListItem;
