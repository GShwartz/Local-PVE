"""
WebSocket proxy for Proxmox VNC console.
This proxies VNC WebSocket connections between the browser and Proxmox,
handling authentication transparently.
"""

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from fastapi.routing import APIRouter
import websockets
import asyncio
import ssl
import os
from Modules.logger import init_logger

router = APIRouter()

PROXMOX_HOST = os.getenv('PROXMOX_HOST', 'pve.home.lab')
PROXMOX_PORT = '8006'

# Create SSL context that doesn't verify certificates (for self-signed certs)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

@router.websocket("/ws/console/{node}/{vmid}")
async def websocket_console_proxy(
    websocket: WebSocket,
    node: str,
    vmid: int,
    port: int,
    ticket: str
):
    """
    WebSocket proxy endpoint for VNC console.
    Proxies VNC WebSocket traffic between browser and Proxmox.
    """
    await websocket.accept()
    
    # Build Proxmox VNC WebSocket URL
    proxmox_ws_url = f"wss://{PROXMOX_HOST}:{PROXMOX_PORT}/api2/json/nodes/{node}/qemu/{vmid}/vncwebsocket?port={port}&vncticket={ticket}"
    
    proxmox_ws = None
    
    try:
        # Connect to Proxmox VNC WebSocket
        proxmox_ws = await websockets.connect(
            proxmox_ws_url,
            ssl=ssl_context,
            extra_headers={
                "Origin": f"https://{PROXMOX_HOST}:{PROXMOX_PORT}"
            }
        )
        
        # Create bidirectional proxy tasks
        async def proxy_to_proxmox():
            """Forward messages from browser to Proxmox"""
            try:
                while True:
                    data = await websocket.receive_bytes()
                    await proxmox_ws.send(data)
            except WebSocketDisconnect:
                pass
            except Exception as e:
                print(f"Error in proxy_to_proxmox: {e}")
        
        async def proxy_from_proxmox():
            """Forward messages from Proxmox to browser"""
            try:
                async for message in proxmox_ws:
                    if isinstance(message, bytes):
                        await websocket.send_bytes(message)
                    else:
                        await websocket.send_text(message)
            except Exception as e:
                print(f"Error in proxy_from_proxmox: {e}")
        
        # Run both proxy directions concurrently
        await asyncio.gather(
            proxy_to_proxmox(),
            proxy_from_proxmox(),
            return_exceptions=True
        )
        
    except Exception as e:
        print(f"WebSocket proxy error: {e}")
        await websocket.close(code=1011, reason=str(e))
    finally:
        if proxmox_ws:
            await proxmox_ws.close()
