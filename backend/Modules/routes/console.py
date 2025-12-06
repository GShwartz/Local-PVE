from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from Modules.services.vnc_service import VNCService
from Modules.services.vm_service import VMService
import os

router = APIRouter()

PROXMOX_HOST = os.getenv('PROXMOX_HOST', 'pve.home.lab')
PROXMOX_PORT = os.getenv('PROXMOX_PORT', '8006')

def get_vnc_service():
    from main import log_file
    return VNCService(log_file=log_file)

@router.get("/console/{node}/{vmid}")
async def get_console(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VNCService = Depends(get_vnc_service),
):
    """
    Redirects to Proxmox web interface VNC console.
    This provides direct console access without WebSocket proxying.
    """
    # Get VNC proxy data for the ticket
    vnc_data = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
    vnc_ticket = vnc_data.get("ticket", "")

    if not vnc_ticket:
        return HTMLResponse(content="<h1>Error: Could not get VNC ticket</h1>", status_code=500)

    # Get VM info for the URL (simple approach without logging)
    vm_name = f"VM{vmid}"  # Default fallback

    try:
        # Try to get actual VM name
        import requests
        from urllib.parse import unquote
        ticket_decoded = unquote(ticket)

        session = requests.Session()
        session.verify = False
        session.cookies.set("PVEAuthCookie", ticket_decoded)

        config_url = f"https://pve.home.lab:8006/api2/json/nodes/{node}/qemu/{vmid}/config"
        response = session.get(config_url)

        if response.status_code == 200:
            vm_config = response.json().get("data", {})
            vm_name = vm_config.get("name", f"VM{vmid}")
    except:
        pass  # Use default if anything fails

    # Try to get Proxmox IP from environment or use hostname
    proxmox_ip = os.getenv('PROXMOX_IP')
    if proxmox_ip:
        console_host = f"{proxmox_ip}:{PROXMOX_PORT}"
    else:
        console_host = f"{PROXMOX_HOST}:{PROXMOX_PORT}"

    # Construct Proxmox web interface URL (HTTP, not HTTPS)
    console_url = (
        f"http://{console_host}/?console=kvm&novnc=1"
        f"&vmid={vmid}&vmname={vm_name}&node={node}"
        f"&resize=off&cmd=&vncticket={vnc_ticket}"
    )

    # Redirect to Proxmox web interface
    return RedirectResponse(url=console_url, status_code=302)
