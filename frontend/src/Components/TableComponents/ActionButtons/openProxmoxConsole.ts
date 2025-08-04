import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';
const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

export async function openProxmoxConsole(
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
    const consoleUrl = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/?console=kvm&novnc=1&node=${encodeURIComponent(
      respNode
    )}&vmid=${encodeURIComponent(respVmid)}`;
    window.open(consoleUrl, '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    console.error('Error opening Proxmox console:', error);
    toast.error(error.message || 'Failed to open console. Please try again.');
  }
}
