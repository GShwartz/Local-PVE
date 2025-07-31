# main.py
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import re
import os
import uvicorn
from pydantic import BaseModel
from Modules.models import LoginRequest, AuthResponse, VMCreateRequest, VMUpdateRequest
from Modules.proxmox_service import ProxmoxService
import asyncio
import websockets
from urllib.parse import quote_plus
import ssl
from Modules.models import VMCloneRequest


class SnapRequest(BaseModel):
    snapname: str
    description: str = ""
    vmstate: int = 0

app = FastAPI(title="Proxmox Controller API")

PROXMOX_HOST = os.getenv("PROXMOX_HOST")
PROXMOX_PORT = 8006  # Default Proxmox port
PROXMOX_USER = os.getenv("PROXMOX_USER")
PROXMOX_PASSWORD = os.getenv("PROXMOX_PASSWORD")
PROXMOX_NODE = os.getenv("PROXMOX_NODE")
VERIFY_SSL = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_proxmox_service() -> ProxmoxService:
    return ProxmoxService()

@app.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.login(login_data.username, login_data.password)

@app.get("/nodes")
async def list_nodes(csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_nodes(csrf_token, ticket)

@app.get("/vms/{node}")
async def list_vms(node: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_vms(node, csrf_token, ticket)

@app.get("/task/{node}/{upid}")
async def get_task_status(node: str, upid: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_task_status(node, upid, csrf_token, ticket)

@app.get("/vm/{node}/qemu/{vmid}/status")
async def get_vm_status(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return {"status": service.get_vm_status(node, vmid, csrf_token, ticket)}

@app.get("/vm/{node}/qemu/{vmid}/config")
async def get_vm_config(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    try:
        config = service.get_vm_config(node, vmid, ticket)
        disks = []
        disk_prefixes = ["ide", "sata", "scsi", "virtio"]
        for key, value in config.items():
            if any(key.startswith(prefix) for prefix in disk_prefixes) and "cdrom" not in value:
                size_match = re.search(r'size=(\d+[KMGT]?)', value)
                if size_match:
                    disks.append(size_match.group(1))
        return {
            "vmid": vmid,
            "name": config.get("name", f"VM {vmid}"),
            "cores": config.get("cores", 0),
            "memory": config.get("memory", 0),
            "ostype": config.get("ostype", "unknown"),
            "hdd_sizes": ", ".join(disks) if disks else "N/A",
            "num_hdd": len(disks),
            "hdd_free": "N/A",
            "ip_address": "N/A",
            "status": service.get_vm_status(node, vmid, csrf_token, ticket),
        }
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to fetch VM config: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error fetching VM config: {str(e)}")

@app.get("/vm/{node}/qemu/{vmid}/snapshots")
async def list_snapshots(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_snapshots(node, vmid, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/clone")
async def clone_vm(
    node: str,
    vmid: int,
    clone_req: VMCloneRequest,
    csrf_token: str,
    ticket: str,
    service: ProxmoxService = Depends(get_proxmox_service)
):
    try:
        return service.clone_vm(node, vmid, clone_req, csrf_token, ticket)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/vm/{node}/qemu/{vmid}/snapshot")
async def create_snapshot(node: str, vmid: int, snap_request: SnapRequest, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    try:
        if not snap_request.snapname or len(snap_request.snapname.strip()) == 0:
            raise HTTPException(status_code=400, detail="Snapshot name cannot be empty or whitespace")
        return service.create_snapshot(
            node,
            vmid,
            snap_request.snapname.strip(),
            snap_request.description,
            snap_request.vmstate,
            csrf_token,
            ticket
        )
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to create snapshot: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error creating snapshot: {str(e)}")

@app.post("/vm/{node}/qemu/{vmid}/snapshot/{snapname}/revert")
async def revert_snapshot(node: str, vmid: int, snapname: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.revert_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.delete("/vm/{node}/qemu/{vmid}/snapshot/{snapname}")
async def delete_snapshot(node: str, vmid: int, snapname: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.delete_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/update_config")
async def update_vm_config(node: str, vmid: int, updates: VMUpdateRequest, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    try:
        return service.update_vm_config(node, vmid, updates, csrf_token, ticket)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to update VM config: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error updating VM config: {str(e)}")

@app.post("/vm/{node}/qemu/{vmid}/vncproxy")
async def get_vnc_proxy(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    try:
        vnc_info = service.get_vnc_proxy(node, vmid, csrf_token, ticket)
        return {
            "port": vnc_info["port"],
            "ticket": vnc_info["ticket"],
            "host": PROXMOX_HOST,
            "node": node,
            "vmid": vmid
        }
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to get VNC proxy: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error getting VNC proxy: {str(e)}")

@app.post("/vm/{node}/qemu/{vmid}/{action}")
async def control_vm(node: str, vmid: int, action: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    if action not in ["start", "stop", "shutdown", "reboot", "hibernate", "resume"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    return service.vm_action(node, vmid, action, csrf_token, ticket)

@app.post("/vm/{node}")
async def create_vm(node: str, vm_create: VMCreateRequest, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    try:
        return service.create_vm(node, vm_create, csrf_token, ticket)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create VM: {str(e)}")

@app.websocket("/ws/console/{node}/{vmid}")
async def websocket_console(websocket: WebSocket, node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    await websocket.accept()
    try:
        vnc_info = service.get_vnc_proxy(node, vmid, csrf_token, ticket)
        port = vnc_info['port']
        vncticket = vnc_info['ticket']
        remote_uri = f"wss://{PROXMOX_HOST}/api2/json/nodes/{node}/qemu/{vmid}/vncwebsocket?port={port}&vncticket={quote_plus(vncticket)}"
        headers = {"Cookie": f"PVEAuthCookie={ticket}"}
        ssl_context = None
        if not VERIFY_SSL:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        async with websockets.connect(remote_uri, extra_headers=headers, ssl=ssl_context) as remote_ws:
            async def client_to_remote():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await remote_ws.send(data)
                except WebSocketDisconnect:
                    pass

            async def remote_to_client():
                try:
                    while True:
                        data = await remote_ws.recv()
                        if isinstance(data, str):
                            data = data.encode('utf-8')
                        await websocket.send_bytes(data)
                except websockets.exceptions.ConnectionClosed:
                    pass

            await asyncio.gather(client_to_remote(), remote_to_client())
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)