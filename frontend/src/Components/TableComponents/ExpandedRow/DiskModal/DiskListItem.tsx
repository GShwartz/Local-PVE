import axios from 'axios';
import { VM } from '../../../../types';
import { useState, useRef, useEffect } from 'react';
import DiskExpandForm from './DiskExpandForm';
import Loader from './Loader';
import styles from '../../../../CSS/ExpandedArea.module.css';

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
  isOnlyDisk,
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

  const [isExpanded, setIsExpanded] = useState(false);

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

      // Delete the disk
      await axios.delete(`http://localhost:8000/vm/${node}/qemu/${vm.vmid}/disk/${diskKey}`, {
        params: { csrf_token: auth.csrf_token, ticket: auth.ticket },
        headers: { 'Content-Type': 'application/json' }
      });

      // Wait a moment for the backend operation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Poll the config to verify the disk is actually removed
      let attempts = 0;
      const maxAttempts = 10;
      let diskRemoved = false;

      while (attempts < maxAttempts) {
        try {
          const configResp = await axios.get<{ config: any }>(
            `http://localhost:8000/vm/${node}/qemu/${vm.vmid}/config`,
            {
              params: {
                csrf_token: auth.csrf_token,
                ticket: auth.ticket
              }
            }
          );

          const config = configResp.data.config || {};
          // Check if the disk is no longer in the config
          if (!config[diskKey]) {
            diskRemoved = true;
            break;
          }
        } catch (err) {
          // Continue polling even if there's an error
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (diskRemoved) {
        addAlert(`✅ Disk ${diskKey} removed successfully from VM ${vm.vmid}.`, 'success');
        await refreshConfig();
        refreshVMs();
      } else {
        // Even if polling didn't confirm, refresh anyway (might be a timing issue)
        addAlert(`✅ Disk ${diskKey} removal completed.`, 'success');
        await refreshConfig();
        refreshVMs();
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      addAlert(`❌ Failed to remove disk ${diskKey}: ${detail}`, 'error');
    } finally {
      setPendingDiskKey(null);
      setDeletingDiskKey(null);
    }
  };

  const disableRemove = isBootDisk || pendingDiskKey !== null || deletingDiskKey === diskKey;

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

      if (isBootDisk) {
        setTooltipMessage('Cannot remove boot disk (SCSI 0)');
        hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
      } else if (pendingDiskKey !== null) {
        setTooltipMessage('Another disk operation is in progress');
        hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
      } else if (deletingDiskKey === diskKey) {
        setTooltipMessage('This disk is being removed');
        hoverTimerRef.current = setTimeout(() => setShowTooltip(true), 1000);
      }
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <li className={styles.listItem}>
      <div className={styles.listItemHeader}>
        <div className="flex items-center space-x-4">
          <span className="text-[16px] font-semibold">💾 {controllerLabel} {controllerNumber}</span>
          <span className="text-base font-medium text-gray-200">{size}</span>
        </div>

        {isPending ? (
          isDeleting ? (
            <Loader />
          ) : (
            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-xs text-red-300">
                {vm.status === 'running' ? 'Shutdown + Remove?' : 'Confirm remove?'}
              </span>
              <button
                onClick={confirmRemoveDisk}
                className={`${styles['button-small']} ${styles['button-small-green']}`}
              >
                Yes
              </button>
              <button
                onClick={() => setPendingDiskKey(null)}
                className={`${styles['button-small']} ${styles['button-small-red']}`}
              >
                No
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center space-x-2">
            {!isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                disabled={pendingDiskKey !== null || deletingDiskKey !== null}
                className={`${styles['button-small']} ${pendingDiskKey !== null || deletingDiskKey !== null ? styles['button-small-disabled'] : styles['button-green']}`}
              >
                Expand
              </button>
            )}

            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setPendingDiskKey(diskKey)}
                disabled={disableRemove}
                className={`${styles['button-small']} ${disableRemove ? styles['button-small-disabled'] : styles['button-small-red']
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

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <DiskExpandForm
            vm={vm}
            node={node}
            auth={auth}
            diskKey={diskKey}
            currentSize={currentSizeGB}
            onClose={() => setIsExpanded(false)}
            addAlert={addAlert}
            refreshConfig={refreshConfig}
            setPendingDiskKey={setPendingDiskKey}
          />
        </div>
      )}
    </li>
  );
};

export default DiskListItem;
