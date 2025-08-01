import { useState, useEffect } from 'react';
import { VM, Auth } from '../../types';
import { UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import ActionButton from './ActionButton';
import CloneButton from './CloneButton';
import ConsoleButton from './ConsoleButton';

interface ActionButtonsProps {
  vm: VM;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<
    string,
    any,
    { vmid: number; action: string; name?: string; cpus?: number },
    unknown
  >;
  showSnapshots: (vmid: number) => void;
  onToggleRow: () => void;
  auth: Auth;
  addAlert: (message: string, type: string) => void;
  refreshVMs: () => void; // ✅ Added
}

const API_BASE_URL = 'http://localhost:8000';
const PROXMOX_NODE = 'pve';
const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

async function openProxmoxConsole(
  node: string,
  vmid: number,
  csrf_token: string,
  ticket: string
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/vm/${node}/qemu/${vmid}/vncproxy?csrf_token=${encodeURIComponent(
        csrf_token
      )}&ticket=${encodeURIComponent(ticket)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to get VNC proxy data: ${await response.text()}`);
    }
    const { node: respNode, vmid: respVmid } = await response.json();
    const consoleUrl =
      `https://${PROXMOX_HOST}:${PROXMOX_PORT}/?console=kvm&novnc=1&node=${encodeURIComponent(
        respNode
      )}&vmid=${encodeURIComponent(respVmid)}`;
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    console.error('Error opening Proxmox console:', error);
    toast.error(error.message || 'Failed to open console. Please try again.');
  }
}

const ActionButtons = ({
  vm,
  pendingActions,
  vmMutation,
  showSnapshots,
  onToggleRow,
  auth,
  addAlert,
  refreshVMs,
}: ActionButtonsProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isCloningInProgress, setIsCloningInProgress] = useState(false);
  const [cloneName, setCloneName] = useState(vm.name);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((a) => a.startsWith('create-'));
  const isClonePending = pendingActions[vm.vmid]?.includes('clone');
  const showCloningLabel = isCloningInProgress || isClonePending;

  const disableAll =
    hasPendingActions || isStarting || isHalting || isCreatingSnapshot || isCloningInProgress;

  const disableConsole =
    !isRebooting && !isStarting && (
      isCreatingSnapshot || isHalting || hasPendingActions
    );

  useEffect(() => {
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') setIsHalting(false);
  }, [vm.status, isHalting]);

  const handleConfirmClone = () => {
    setIsCloning(false);
    setIsCloningInProgress(true);
    vmMutation.mutate(
      { vmid: vm.vmid, action: 'clone', name: cloneName },
      {
        onSuccess: () => {
          setIsCloningInProgress(false);
          addAlert(`Cloning of VM ${vm.name} started`, 'success');
        },
        onError: () => {
          setIsCloningInProgress(false);
          toast.error('Cloning failed.');
        },
      }
    );
  };

  const handleCancelClone = () => {
    setIsCloning(false);
    setCloneName(vm.name);
  };

  const handleConfirmRemove = () => {
    setIsRemoving(true);
    setShowRemoveConfirm(false);
    fetch(
      `${API_BASE_URL}/vm/${PROXMOX_NODE}/qemu/${vm.vmid}?csrf_token=${encodeURIComponent(
        auth.csrf_token
      )}&ticket=${encodeURIComponent(auth.ticket)}`,
      { method: 'DELETE' }
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete VM');
        return res.json();
      })
      .then(() => {
        setIsRemoving(false);
        addAlert(`VM ${vm.name} was removed`, 'success');
        refreshVMs(); // ✅ Refresh table
      })
      .catch((err) => {
        setIsRemoving(false);
        toast.error(err.message || 'Failed to delete VM');
        addAlert(`Failed to remove VM ${vm.name}: ${err.message}`, 'error');
      });
  };

  const handleCancelRemove = () => {
    setShowRemoveConfirm(false);
  };

  const removeDisabled = isCloningInProgress || vm.status === 'running';

  return (
    <td
      className="px-2 py-1 text-center action-buttons-cell"
      style={{
        height: '48px',
        verticalAlign: 'middle',
        position: 'relative',
        display: 'flex', // ✅ Added
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onToggleRow}
    >
      <div className="flex space-x-2.5 justify-center items-center" style={{ height: '48px' }}>
        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsStarting(true);
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'start', name: vm.name },
              { onError: () => setIsStarting(false) }
            );
          }}
          disabled={vm.status === 'running' || vm.status === 'suspended' || disableAll}
          className={vm.status === 'running' || vm.status === 'suspended' || disableAll ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
        >
          Start
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'stop', name: vm.name },
              { onError: () => setIsHalting(false) }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={vm.status !== 'running' || disableAll ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
        >
          Stop
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'shutdown', name: vm.name },
              { onError: () => setIsHalting(false) }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={vm.status !== 'running' || disableAll ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'}
        >
          Shutdown
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            setIsRebooting(true);
            vmMutation.mutate(
              { vmid: vm.vmid, action: 'reboot', name: vm.name },
              { onError: () => setIsRebooting(false) }
            );
          }}
          disabled={vm.status !== 'running' || disableAll}
          className={vm.status !== 'running' || disableAll ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
        >
          Reboot
        </ActionButton>

        <ActionButton
          onClick={(e) => {
            e.stopPropagation();
            showSnapshots(vm.vmid);
          }}
          disabled={disableAll}
          className={disableAll ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}
        >
          Snapshots
        </ActionButton>

        <ConsoleButton
          onClick={(e) => {
            e.stopPropagation();
            openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
          }}
          disabled={disableConsole}
        />

        <CloneButton
          disabled={disableAll}
          showCloningLabel={showCloningLabel}
          isCloning={isCloning}
          cloneName={cloneName}
          onToggle={() => {
            if (!isCloningInProgress) {
              setIsCloning((prev) => {
                const next = !prev;
                if (next) setCloneName(vm.name);
                return next;
              });
            }
          }}
          onChange={setCloneName}
          onConfirm={handleConfirmClone}
          onCancel={handleCancelClone}
        />

        <div className="relative">
          <ActionButton
            onClick={(e) => {
              e.stopPropagation();
              setShowRemoveConfirm((v) => !v);
            }}
            disabled={removeDisabled}
            className={removeDisabled ? 'bg-gray-600 cursor-not-allowed' : 'bg-pink-700 hover:bg-pink-800'}
          >
            Remove
          </ActionButton>

          {showRemoveConfirm && (
            <span
              className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-md p-3 flex items-center space-x-2 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleConfirmRemove}
                className="text-white bg-green-600 hover:bg-green-500 rounded-md px-3 py-1"
                style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
              >
                ✔
              </button>
              <button
                onClick={handleCancelRemove}
                className="text-white bg-red-600 hover:bg-red-500 rounded-md px-3 py-1"
                style={{ fontSize: '1.25rem', fontFamily: 'Arial, sans-serif', lineHeight: '1' }}
              >
                ✖
              </button>
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

export default ActionButtons;
