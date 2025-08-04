from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/login", response_model=AuthResponse)
async def login(
    login_data: LoginRequest,
    auth: AuthService = Depends(get_auth_service),
):
    return auth.login(login_data.username, login_data.password)

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
        disks = []
        for key, value in config.items():
            if any(key.startswith(prefix) for prefix in ("ide", "sata", "scsi", "virtio")) and "cdrom" not in value:
                m = re.search(r'size=(\d+[KMGT]?)', value)
                if m:
                    disks.append(m.group(1))
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
            "status": svc.get_vm_status(node, vmid, csrf_token, ticket),
            "config": config,
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
    csrf_token: str,
    ticket: str,
    svc: VNCService = Depends(get_vnc_service),
):
    await websocket.accept()
    try:
        vnc = svc.get_vnc_proxy(node, vmid, csrf_token, ticket)
        port = vnc["port"]
        vncticket = vnc["ticket"]
        remote_uri = (
            f"wss://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}"
            f"/api2/json/nodes/{node}/qemu/{vmid}/vncwebsocket"
            f"?port={port}&vncticket={quote_plus(vncticket)}"
        )
        headers = {"Cookie": f"PVEAuthCookie={ticket}"}
        ssl_ctx = None
        if not os.getenv("VERIFY_SSL", "false").lower().startswith("t"):
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

        async with websockets.connect(remote_uri, extra_headers=headers, ssl=ssl_ctx) as remote_ws:
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
