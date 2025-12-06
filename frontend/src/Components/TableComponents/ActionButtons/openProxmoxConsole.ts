import toast from 'react-hot-toast';

const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

export async function openProxmoxConsole(
  node: string,
  vmid: number,
  csrf_token: string,
  ticket: string
) {
  // Open Proxmox console page
  const consoleUrl = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/?console=kvm&novnc=1&node=${encodeURIComponent(
    node
  )}&vmid=${encodeURIComponent(vmid)}&resize=scale`;

  window.open(consoleUrl, '_blank');

  // Show helpful message
  toast('Console opening in new tab. Login with: app@pve / Pass12344321!!', {
    duration: 5000,
    icon: '🖥️',
  });
}
