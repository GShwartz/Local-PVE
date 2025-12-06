from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from Modules.services.vnc_service import VNCService
import os

router = APIRouter()

PROXMOX_HOST = os.getenv('PROXMOX_HOST', 'pve.home.lab')
PROXMOX_PORT = '8006'
BACKEND_HOST = 'localhost'
BACKEND_PORT = '8000'

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
    Serves a noVNC console viewer that connects through our WebSocket proxy.
    This provides seamless console access without requiring separate Proxmox login.
    """
    # Get VNC proxy data from Proxmox
    vnc_data = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
    vnc_ticket = vnc_data.get("ticket")
    vnc_port = vnc_data.get("port")
    
    if not vnc_ticket or not vnc_port:
        return HTMLResponse(content="<h1>Error: Failed to get VNC credentials</h1>", status_code=500)
    
    # Serve HTML page that redirects to Proxmox with proper session
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>VM {vmid} Console</title>
    <meta charset="utf-8">
    <style>
        body {{
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
        }}
        iframe {{
            width: 100vw;
            height: 100vh;
            border: none;
        }}
        #status {{
            position: absolute;
            top: 20px;
            left: 20px;
            color: #fff;
            background: rgba(0,0,0,0.8);
            padding: 15px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div id="status">Loading console for VM {vmid}...</div>
    <script>
        // Build the Proxmox console URL with VNC ticket
        const consoleUrl = 'https://{PROXMOX_HOST}:{PROXMOX_PORT}/?console=kvm&novnc=1&node={node}&vmid={vmid}&port={vnc_port}&vncticket=' + encodeURIComponent('{vnc_ticket}');
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = consoleUrl;
        iframe.allow = 'cross-origin-isolated';
        
        // Hide status after load
        iframe.onload = function() {{
            setTimeout(() => {{
                document.getElementById('status').style.display = 'none';
            }}, 2000);
        }};
        
        iframe.onerror = function() {{
            document.getElementById('status').innerHTML = 'Error loading console';
            document.getElementById('status').style.color = '#f87171';
        }};
        
        document.body.appendChild(iframe);
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html_content)
