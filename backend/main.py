from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Body
from urllib.parse import unquote
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import quote_plus
from pydantic import BaseModel
import websockets
import uvicorn
import asyncio
import ssl
import os
import re

from Modules.logger import init_logger
from Modules.models import (
    LoginRequest,
    AuthResponse,
    VMCreateRequest,
    VMUpdateRequest,
    VMCloneRequest,
    VMDiskAddRequest,
)
from Modules.services.auth_service import AuthService
from Modules.services.vm_service import VMService
from Modules.services.snapshot_service import SnapshotService
from Modules.services.disk_service import DiskService
from Modules.services.task_service import TaskService
from Modules.services.vnc_service import VNCService

class DiskExpandRequest(BaseModel):
    new_size: int  # GB


# Logging setup
log_file = os.path.join(os.path.dirname(__file__), 'local-pve.log')
if not os.path.exists(log_file):
    with open(log_file, 'w'):
        pass
logger = init_logger(log_file, __name__)

# Pydantic model for snapshot requests
class SnapRequest(BaseModel):
    snapname: str
    description: str = ""
    vmstate: int = 0

# FastAPI app
app = FastAPI(title="Proxmox Controller API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include console routers
from Modules.routes.console import router as console_router
# from Modules.routes.console_ws import router as console_ws_router  # Conflicts with main.py WebSocket
app.include_router(console_router)
# app.include_router(console_ws_router)

# Dependency providers
def get_auth_service() -> AuthService:
    return AuthService(log_file=log_file)


def get_vm_service() -> VMService:
    return VMService(log_file=log_file)


def get_snapshot_service() -> SnapshotService:
    return SnapshotService(log_file=log_file)


def get_disk_service() -> DiskService:
    return DiskService(log_file=log_file)


def get_task_service() -> TaskService:
    return TaskService(log_file=log_file)


def get_vnc_service() -> VNCService:
    return VNCService(log_file=log_file)

# Endpoints

@app.post("/login")
async def login(
    login_data: LoginRequest,
    auth: AuthService = Depends(get_auth_service),
):
    from fastapi.responses import JSONResponse
    
    # Authenticate with Proxmox
    auth_response = auth.login(login_data.username, login_data.password)
    
    # Create response with Proxmox cookies for console access
    response = JSONResponse(content=auth_response)
    
    # Set Proxmox authentication cookies for console
    # This allows the console to work without separate Proxmox login
    proxmox_host = os.getenv('PROXMOX_HOST', 'pve.home.lab')
    
    response.set_cookie(
        key="PVEAuthCookie",
        value=auth_response["ticket"],
        domain=proxmox_host,
        path="/",
        secure=True,
        httponly=True,
        samesite="none",
        max_age=7200  # 2 hours
    )
    
    response.set_cookie(
        key="CSRFPreventionToken",
        value=auth_response["csrf_token"],
        domain=proxmox_host,
        path="/",
        secure=True,
        httponly=False,
        samesite="none",
        max_age=7200  # 2 hours
    )
    
    return response

@app.get("/vms/{node}")
async def list_vms(
    node: str,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    return await svc.get_vms(node, csrf_token, ticket)

@app.get("/task/{node}/{upid}")
async def get_task_status(
    node: str,
    upid: str,
    csrf_token: str,
    ticket: str,
    svc: TaskService = Depends(get_task_service),
):
    return svc.get_task_status(node, upid, csrf_token, ticket)

@app.get("/vm/{node}/qemu/{vmid}/status")
async def get_vm_status(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    return {"status": svc.get_vm_status(node, vmid, csrf_token, ticket)}

@app.get("/vm/{node}/qemu/{vmid}/config")
async def get_vm_config(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    try:
        config = svc.get_vm_config(node, vmid, ticket)

        # ✅ Sort NICs and Disks by their numeric suffix
        def sort_key(item):
            key = item[0]
            # Patterns to sort: net0, scsi0, virtio1, sata2, ide3
            patterns = ("net", "scsi", "virtio", "sata", "ide")
            for p in patterns:
                if key.startswith(p) and key[len(p):].isdigit():
                    return (0, p, int(key[len(p):]))
            return (1, key, 0)  # Non-matching keys go later, sorted by name

        sorted_config = dict(sorted(config.items(), key=sort_key))

        # HDD sizes for summary
        disks = []
        for key, value in sorted_config.items():
            if any(key.startswith(prefix) for prefix in ("ide", "sata", "scsi", "virtio")) and isinstance(value, str):
                if "cdrom" not in value:
                    m = re.search(r'size=(\d+[KMGT]?)', value)
                    if m:
                        disks.append(m.group(1))

        return {
            "vmid": vmid,
            "name": sorted_config.get("name", f"VM {vmid}"),
            "cores": sorted_config.get("cores", 0),
            "memory": sorted_config.get("memory", 0),
            "ostype": sorted_config.get("ostype", "unknown"),
            "hdd_sizes": ", ".join(disks) if disks else "N/A",
            "num_hdd": len(disks),
            "hdd_free": "N/A",
            "ip_address": "N/A",
            "status": svc.get_vm_status(node, vmid, csrf_token, ticket),
            "config": sorted_config,
        }
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to fetch VM config: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.post("/vm/{node}/qemu/{vmid}/update_config")
async def update_vm_config(
    node: str,
    vmid: int,
    updates: VMUpdateRequest,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    try:
        return svc.update_vm_config(node, vmid, updates, csrf_token, ticket)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Failed to update VM config: {e.detail}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.get("/vm/{node}/qemu/{vmid}/snapshots")
async def list_snapshots(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    return svc.get_snapshots(node, vmid, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/clone")
async def clone_vm(
    node: str,
    vmid: int,
    clone_req: VMCloneRequest,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    return svc.clone_vm(node, vmid, clone_req, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/snapshot")
async def create_snapshot(
    node: str,
    vmid: int,
    snap_request: SnapRequest,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    if not snap_request.snapname.strip():
        raise HTTPException(status_code=400, detail="Snapshot name cannot be empty")
    return svc.create_snapshot(
        node,
        vmid,
        snap_request.snapname.strip(),
        snap_request.description,
        snap_request.vmstate,
        csrf_token,
        ticket,
    )

@app.post("/vm/{node}/qemu/{vmid}/snapshot/{snapname}/revert")
async def revert_snapshot(
    node: str,
    vmid: int,
    snapname: str,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    return svc.revert_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.delete("/vm/{node}/qemu/{vmid}/snapshot/{snapname}")
async def delete_snapshot(
    node: str,
    vmid: int,
    snapname: str,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    return svc.delete_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/vncproxy")
async def get_vnc_proxy(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VNCService = Depends(get_vnc_service),
):
    data = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
    return {
        "port": data["port"],
        "ticket": data["ticket"],
        "host": os.getenv("PROXMOX_HOST", "pve.home.lab"),
        "node": node,
        "vmid": vmid,
    }

@app.post("/vm/{node}")
async def create_vm(
    node: str,
    vm_create: VMCreateRequest,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    return svc.create_vm(node, vm_create, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/add-disk")
async def add_disk(
    node: str,
    vmid: int,
    req: VMDiskAddRequest,
    csrf_token: str,
    ticket: str,
    svc: DiskService = Depends(get_disk_service),
):
    return svc.add_disk(node, vmid, req, csrf_token, ticket)

@app.delete("/vm/{node}/qemu/{vmid}/disk/{disk_key}")
async def delete_disk(
    node: str,
    vmid: int,
    disk_key: str,
    csrf_token: str,
    ticket: str,
    svc: DiskService = Depends(get_disk_service),
):
    return svc.delete_disk(node, vmid, disk_key, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/activate-unused-disk/{unused_key}")
async def activate_unused_disk(
    node: str,
    vmid: int,
    unused_key: str,
    csrf_token: str,
    ticket: str,
    target_controller: str = "scsi",
    svc: DiskService = Depends(get_disk_service),
):
    return await svc.activate_unused_disk(node, vmid, unused_key, target_controller, csrf_token, ticket)

@app.delete("/vm/{node}/qemu/{vmid}")
async def delete_vm(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    return svc.delete_vm(node, vmid, csrf_token, ticket)

@app.post("/vm/{node}/qemu/{vmid}/{action}")
async def control_vm(
    node: str,
    vmid: int,
    action: str,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
):
    # Convert hibernate to suspend
    if action == "hibernate":
        action = "suspend"

    if action not in ["start", "stop", "shutdown", "reboot", "suspend", "resume"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    return svc.vm_action(node, vmid, action, csrf_token, ticket)

@app.websocket("/ws/console/{node}/{vmid}")
async def websocket_console(
    websocket: WebSocket,
    node: str,
    vmid: int,
    csrf_token: str = Query(...),
    ticket: str = Query(...),
    svc: VNCService = Depends(get_vnc_service),
):
    await websocket.accept()
    try:
        # Keep tokens URL-encoded for VNC proxy (maybe it expects encoded tokens)
        print(f"DEBUG: Using URL-encoded tokens for VNC proxy")
        print(f"DEBUG: CSRF: {csrf_token[:20]}...")
        print(f"DEBUG: Ticket: {ticket[:20]}...")

        # Get VNC proxy data using the main auth credentials
        vnc_data = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
        vnc_port = str(vnc_data.get("port", ""))
        vnc_ticket = vnc_data.get("ticket", "")

        if not vnc_port or not vnc_ticket:
            print(f"DEBUG: Failed to get VNC data - Port: {vnc_port}, Ticket: {bool(vnc_ticket)}")
            await websocket.close(code=1011, reason="Failed to get VNC credentials")
            return

        remote_uri = (
            f"wss://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}:8006"
            f"/api2/json/nodes/{node}/qemu/{vmid}/vncwebsocket"
            f"?port={vnc_port}&vncticket={quote_plus(vnc_ticket)}"
        )
        print(f"DEBUG: WebSocket connecting to Proxmox: {remote_uri}")
        print(f"DEBUG: Node: {node}, VMID: {vmid}, VNC Port: {vnc_port}")

        # For VNC WebSocket, authentication is handled by the vncticket parameter
        headers = {}
        ssl_ctx = None
        if not os.getenv("VERIFY_SSL", "false").lower().startswith("t"):
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

        print(f"DEBUG: Attempting WebSocket connection to Proxmox...")
        async with websockets.connect(remote_uri, extra_headers=headers, ssl=ssl_ctx) as remote_ws:
            print(f"DEBUG: Successfully connected to Proxmox VNC WebSocket")

            async def client_to_remote():
                try:
                    while True:
                        data = await websocket.receive_bytes()
                        await remote_ws.send(data)
                except WebSocketDisconnect:
                    print(f"DEBUG: Client disconnected from WebSocket")
                    pass

            async def remote_to_client():
                try:
                    while True:
                        data = await remote_ws.recv()
                        if isinstance(data, str):
                            data = data.encode('utf-8')
                        await websocket.send_bytes(data)
                except websockets.exceptions.ConnectionClosed:
                    print(f"DEBUG: Proxmox WebSocket connection closed")
                    pass

            await asyncio.gather(client_to_remote(), remote_to_client())
    except Exception as e:
        print(f"DEBUG: WebSocket proxy error: {e}")
        await websocket.close(code=1011, reason=str(e))

@app.post("/vm/{node}/qemu/{vmid}/disk/{disk_key}/expand")
async def expand_disk(
    node: str,
    vmid: int,
    disk_key: str,
    req: DiskExpandRequest,
    csrf_token: str,
    ticket: str,
    svc: DiskService = Depends(get_disk_service),
):
    return svc.expand_disk(node, vmid, disk_key, req.new_size, csrf_token, ticket)

@app.delete("/vm/{node}/qemu/{vmid}/network")
async def remove_network_interface(
    node: str,
    vmid: int,
    nic: str = Query(...),
    csrf_token: str = Query(...),
    ticket: str = Query(...),
    svc: VMService = Depends(get_vm_service)
):
    if not nic:
        raise HTTPException(status_code=400, detail="NIC name is required")
    try:
        return svc.modify_vm_network(node, vmid, net=None, delete=nic, csrf_token=csrf_token, ticket=ticket)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/vm/{node}/qemu/{vmid}/network")
async def update_network_interface(
    node: str,
    vmid: int,
    config: dict = Body(...),
    csrf_token: str = Query(...),
    ticket: str = Query(...),
    svc: VMService = Depends(get_vm_service)
):
    try:
        return svc.modify_vm_network(node, vmid, net=config, delete=None, csrf_token=csrf_token, ticket=ticket)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
