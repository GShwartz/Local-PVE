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

const API_BASE_URL = 'http://localhost:8000';
const PROXMOX_NODE = 'pve';
// Proxmox host (IP or domain) and port for console
const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

async function openProxmoxConsole(
  node: string,
  vmid: number,
  csrf_token: string,
  ticket: string
) {
  try {
    // Trigger backend to set PVEAuthCookie and return node/vmid
    const response = await fetch(
      `${API_BASE_URL}/vm/${node}/qemu/${vmid}/vncproxy?csrf_token=${encodeURIComponent(csrf_token)}&ticket=${encodeURIComponent(ticket)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get VNC proxy data: ${errorText}`);
    }

    const { node: responseNode, vmid: responseVmid } = await response.json();

    // Build direct Proxmox noVNC console URL
    const consoleUrl =
      `https://${PROXMOX_HOST}:${PROXMOX_PORT}/?console=kvm&novnc=1&node=${encodeURIComponent(responseNode)}` +
      `&vmid=${encodeURIComponent(responseVmid)}`;

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
    if (isStarting && vm.status === 'running') setIsStarting(false);
  }, [vm.status, isStarting]);

  useEffect(() => {
    if (isHalting && vm.status !== 'running') setIsHalting(false);
  }, [vm.status, isHalting]);

  return (
    <td className="px-2 py-2 text-center action-buttons-cell" style={{ height: '48px', verticalAlign: 'middle' }} onClick={onToggleRow}>
      <div className="flex space-x-2.5 justify-center items-center" style={{ height: '48px' }}>
        {/* Start */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsStarting(true); vmMutation.mutate({ vmid: vm.vmid, action: 'start', name: vm.name }, { onError: () => setIsStarting(false) }); }}
          disabled={vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot}
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status === 'running' || vm.status === 'suspended' || hasPendingActions || isStarting || isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >Start</button>

        {/* Stop */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsHalting(true); vmMutation.mutate({ vmid: vm.vmid, action: 'stop', name: vm.name }, { onError: () => setIsHalting(false) }); }}
          disabled={
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('stop') ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            isHalting ||
            isCreatingSnapshot
          }
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('stop') ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            isHalting ||
            isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >Stop</button>

        {/* Shutdown */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsHalting(true); vmMutation.mutate({ vmid: vm.vmid, action: 'shutdown', name: vm.name }, { onError: () => setIsHalting(false) }); }}
          disabled={
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            pendingActions[vm.vmid]?.includes('stop') ||
            isHalting ||
            isCreatingSnapshot
          }
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            pendingActions[vm.vmid]?.includes('stop') ||
            isHalting ||
            isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >Shutdown</button>

        {/* Reboot */}
        <button
          onClick={(e) => { e.stopPropagation(); vmMutation.mutate({ vmid: vm.vmid, action: 'reboot', name: vm.name }); }}
          disabled={
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('reboot') ||
            pendingActions[vm.vmid]?.includes('stop') ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            isHalting ||
            isCreatingSnapshot
          }
          className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            vm.status !== 'running' ||
            pendingActions[vm.vmid]?.includes('reboot') ||
            pendingActions[vm.vmid]?.includes('stop') ||
            pendingActions[vm.vmid]?.includes('shutdown') ||
            isHalting ||
            isCreatingSnapshot
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >Reboot</button>

        {/* Snapshots */}
        <button
          onClick={(e) => { e.stopPropagation(); showSnapshots(vm.vmid); }}
          disabled={pendingActions[vm.vmid]?.includes('snapshots')}
          className={`px-2 py-1 text-md font-medium rounded-md active:scale-95 transition-transform duration-100 ${
            pendingActions[vm.vmid]?.includes('snapshots')
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
          style={{ height: '34px', lineHeight: '1.5' }}
        >Snapshots</button>

        {/* Console */}
        <button
          onClick={(e) => { e.stopPropagation(); openProxmoxConsole(PROXMOX_NODE, vm.vmid, auth.csrf_token, auth.ticket); }}
          className="px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 bg-teal-600 hover:bg-teal-700 text-white"
          style={{ height: '34px', lineHeight: '1.5' }}
        >Console</button>
      </div>
    </td>
  );
};

export default ActionButtons;
