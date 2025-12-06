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
    This provides seamless multi-tenant console access without exposing Proxmox credentials.
    """
    # Get VNC proxy data from Proxmox
    vnc_data = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
    vnc_ticket = vnc_data.get("ticket")
    vnc_port = vnc_data.get("port")
    
    if not vnc_ticket or not vnc_port:
        return HTMLResponse(content="<h1>Error: Failed to get VNC credentials</h1>", status_code=500)
    
    # Serve HTML page with noVNC viewer using unpkg CDN
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>VM {vmid} Console</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
            font-family: Arial, sans-serif;
        }}
        #screen {{
            width: 100vw;
            height: 100vh;
        }}
        #status {{
            position: absolute;
            top: 20px;
            left: 20px;
            color: #fff;
            background: rgba(0,0,0,0.8);
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }}
        .status-connected {{ color: #4ade80; }}
        .status-error {{ color: #f87171; }}
        .status-connecting {{ color: #fbbf24; }}
    </style>
</head>
<body>
    <div id="status" class="status-connecting">● Connecting to VM {vmid}...</div>
    <div id="screen"></div>
    
    <script type="module">
        // Import noVNC RFB from unpkg CDN
        import RFB from 'https://unpkg.com/@novnc/novnc@1.4.0/core/rfb.js';
        
        const screen = document.getElementById('screen');
        const status = document.getElementById('status');
        
        // Connect to our WebSocket proxy
        const wsUrl = 'ws://{BACKEND_HOST}:{BACKEND_PORT}/ws/console/{node}/{vmid}?port={vnc_port}&ticket={vnc_ticket}';
        
        console.log('Connecting to:', wsUrl);
        
        try {{
            // Create RFB (Remote Frame Buffer) connection
            const rfb = new RFB(screen, wsUrl, {{
                credentials: {{ password: '' }},
                shared: true
            }});
            
            // Event handlers
            rfb.addEventListener('connect', () => {{
                console.log('Connected to VM {vmid}');
                status.className = 'status-connected';
                status.innerHTML = '● Connected to VM {vmid}';
                setTimeout(() => {{
                    status.style.display = 'none';
                }}, 3000);
            }});
            
            rfb.addEventListener('disconnect', (e) => {{
                console.log('Disconnected:', e.detail);
                status.className = 'status-error';
                status.innerHTML = '● Disconnected from VM {vmid}';
                status.style.display = 'block';
            }});
            
            rfb.addEventListener('securityfailure', (e) => {{
                console.error('Security failure:', e.detail);
                status.className = 'status-error';
                status.innerHTML = '● Security failure: ' + e.detail.reason;
                status.style.display = 'block';
            }});
            
            // Set scale mode for better UX
            rfb.scaleViewport = true;
            rfb.resizeSession = true;
            
        }} catch (error) {{
            console.error('Connection error:', error);
            status.className = 'status-error';
            status.innerHTML = '● Connection error: ' + error.message;
        }}
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html_content)
