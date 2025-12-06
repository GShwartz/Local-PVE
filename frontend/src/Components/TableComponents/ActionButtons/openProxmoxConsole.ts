import toast from 'react-hot-toast';

const PROXMOX_HOST = 'pve.home.lab';
const PROXMOX_PORT = '8006';

export async function openProxmoxConsole(
  node: string,
  vmid: number,
  csrf_token: string,
  ticket: string
) {
  // Open our backend console endpoint that handles authentication properly
  const consoleUrl = `http://localhost:8000/console/${encodeURIComponent(node)}/${vmid}?csrf_token=${encodeURIComponent(csrf_token)}&ticket=${encodeURIComponent(ticket)}`;

  window.open(consoleUrl, '_blank');

  // Show helpful message
  toast('Console opening in new tab...', {
    duration: 3000,
    icon: '🖥️',
  });
}
