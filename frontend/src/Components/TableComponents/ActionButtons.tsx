// ActionButtons.tsx
import { useState, useEffect } from 'react';
import { VM, Auth } from '../../types';
import { UseMutationResult } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface ActionButtonsProps {
  vm: VM;
  pendingActions: { [vmid: number]: string[] };
  vmMutation: UseMutationResult<string, any, { vmid: number; action: string; name?: string; cpus?: number }, unknown>;
  showSnapshots: (vmid: number) => void;
  onToggleRow: () => void;
  auth: Auth;
}

const API_BASE_URL = 'http://localhost:8000'; // Match FastAPI server address
const PROXMOX_NODE = 'pve'; // Match PROXMOX_NODE from main.py, adjust if dynamic

async function openProxmoxConsole(node: string, vmid: number, csrf_token: string, ticket: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/vm/${node}/qemu/${vmid}/vncproxy?csrf_token=${encodeURIComponent(csrf_token)}&ticket=${encodeURIComponent(ticket)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get VNC proxy data: ${errorText}`);
    }

    const { ticket: vncTicket, node: responseNode, vmid: responseVmid } = await response.json();

    const consoleUrl = `https://novnc.com/noVNC/vnc.html?host=10.0.0.7&port=8000&path=ws/console/${responseNode}/${responseVmid}?csrf_token=${encodeURIComponent(csrf_token)}&ticket=${encodeURIComponent(ticket)}&password=${encodeURIComponent(vncTicket)}&autoconnect=1`;

    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    console.error('Error opening Proxmox console:', error);
    toast.error(error.message || 'Failed to open console. Please try again.');
  }
}

const ActionButtons = ({ vm, pendingActions, vmMutation, showSnapshots, onToggleRow, auth }: ActionButtonsProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const hasPendingActions = pendingActions[vm.vmid]?.length > 0;
  const isCreatingSnapshot = pendingActions[vm.vmid]?.some((action) => action.startsWith('create-'));

  useEffect(() => {
    if (isStarting && vm.status === 'running') {
      setIsStarting(false);
    }
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') {
      setIsHalting(false);
    }
  }, [vm.status, isHalting]);

  return (
    <td
      className="px-2 py-2 text-center action-buttons-cell"
      style={{ height: '48px', verticalAlign: 'middle' }}
      onClick={onToggleRow}
    >
      <div className="flex space-x-2.5 justify-center items-center" style={{ height: '48px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsStarting(true);
            vmMutation.mutate({ vmid: vm.vmid, action: 'start', name: vm.name }, {
              onError: () => setIsStarting(false),
            });
          }}
          disabled={vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Start
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            vmMutation.mutate({ vmid: vm.vmid, action: 'stop', name: vm.name }, {
              onError: () => setIsHalting(false),
            });
          }}
          disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Stop
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsHalting(true);
            vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown', name: vm.name }, {
              onError: () => setIsHalting(false),
            });
          }}
          disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown') || pendingActions[vm.vmid]?.includes('stop') || isHalting || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' || pendingActions[vm.vmid]?.includes('shutdown') || pendingActions[vm.vmid]?.includes('stop') || isHalting || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Shutdown
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            vmMutation.mutate({ vmid: vm.vmid, action: 'reboot', name: vm.name });
          }}
          disabled={vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot') || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' || pendingActions[vm.vmid]?.includes('reboot') || pendingActions[vm.vmid]?.includes('stop') || pendingActions[vm.vmid]?.includes('shutdown') || isHalting || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Reboot
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            showSnapshots(vm.vmid);
          }}
          disabled={pendingActions[vm.vmid]?.includes('snapshots')}
          className={`px-2 py-1 text-md font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            pendingActions[vm.vmid]?.includes('snapshots')
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Snapshots
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket);
          }}
          disabled={vm.status !== 'running' || hasPendingActions || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' || hasPendingActions || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >
          Console
        </button>
      </div>
    </td>
  );
};

export default ActionButtons;