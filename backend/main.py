from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, Body, UploadFile, File
from contextlib import asynccontextmanager
from urllib.parse import quote_plus
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update
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
from Modules.database.connection import get_db, init_db, close_db, validate_db_connection
from Modules.services.db_service import (
    log_action,
    get_audit_logs,
    get_vm_metadata,
    upsert_vm_metadata,
    create_session,
    get_disk_metadata,
    upsert_disk_metadata,
    get_user_by_username,
    create_app_user,
)
from Modules.database.db_models import AppUser

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

# ── Image path validation ────────────────────────────────────────────────────

def _check_image_paths() -> None:
    """
    Validate that the configured qcow2 and ISO image directories exist on the
    host running the backend.  Logs a WARNING for each missing path so the
    operator knows to create the directory or update Settings before using the
    affected features.  Never raises — missing paths are non-fatal at startup.
    """
    paths = {
        "qcow2 images": os.getenv("QCOW2_IMAGES_PATH", "/var/lib/vz/images"),
        "ISO images":   os.getenv("ISO_IMAGES_PATH",   "/var/lib/vz/template/iso"),
    }
    for label, path in paths.items():
        if os.path.isdir(path):
            logger.info(f"Image path OK [{label}]: {path}")
        else:
            logger.warning(
                f"Image path NOT FOUND [{label}]: {path}  "
                f"— create the directory or update the path in Settings."
            )

# FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    await validate_db_connection()  # abort early with a clear message if DB is unreachable
    await init_db()                 # creates all tables on first run
    _check_image_paths()            # warn if qcow2 / ISO directories are missing
    yield
    await close_db()                # disposes connection pool on shutdown

app = FastAPI(title="Proxmox Controller API", lifespan=lifespan)

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
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import JSONResponse

    auth_response = None
    role = 'admin'  # default for direct Proxmox users

    # Try Proxmox auth first (handles user@realm style usernames)
    try:
        auth_response = auth.login(login_data.username, login_data.password)
    except Exception:
        # Fall back to app-user auth for plain usernames (no '@')
        if '@' not in login_data.username:
            app_user = await get_user_by_username(db, login_data.username)
            if app_user and app_user.is_active:
                if app_user.password_hash == _hash_password(login_data.password):
                    role = app_user.role  # use role from app_users table
                    # Authenticate via admin Proxmox account on behalf of the app user
                    proxmox_user = os.getenv('PROXMOX_USER', 'app@pve')
                    proxmox_password = os.getenv('PROXMOX_PASSWORD', '')
                    try:
                        auth_response = auth.login(proxmox_user, proxmox_password)
                    except Exception as admin_err:
                        raise HTTPException(status_code=401, detail=f"Admin Proxmox login failed: {admin_err}")
                else:
                    raise HTTPException(status_code=401, detail="Invalid credentials")
            else:
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            raise HTTPException(status_code=401, detail="Proxmox authentication failed")

    if auth_response is None:
        raise HTTPException(status_code=401, detail="Authentication failed")

    # Store session server-side
    try:
        await create_session(
            db,
            proxmox_ticket=auth_response["ticket"],
            proxmox_csrf_token=auth_response["csrf_token"],
            proxmox_username=login_data.username,
        )
        await log_action(db, action="login", username=login_data.username,
                         details={"proxmox_user": login_data.username, "role": role})
    except Exception as e:
        logger.warning(f"Audit log failed for login: {e}")

    # Create response with Proxmox cookies for console access
    response = JSONResponse(content={**auth_response, "role": role})

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
    db: AsyncSession = Depends(get_db),
):
    try:
        result = svc.update_vm_config(node, vmid, updates, csrf_token, ticket)
        try:
            await log_action(db, action="vm_config_update", node=node, vmid=vmid,
                             details={"updates": updates.model_dump(exclude_none=True)})
        except Exception as e:
            logger.warning(f"Audit log failed for vm_config_update: {e}")
        return result
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
    db: AsyncSession = Depends(get_db),
):
    result = svc.clone_vm(node, vmid, clone_req, csrf_token, ticket)
    if not result:
        raise HTTPException(status_code=500, detail="Clone request succeeded but Proxmox returned no task ID")
    try:
        await log_action(db, action="vm_clone", node=node, vmid=vmid,
                         details={"new_name": clone_req.name, "target": clone_req.target})
    except Exception as e:
        logger.warning(f"Audit log failed for vm_clone: {e}")
    return result

@app.post("/vm/{node}/qemu/{vmid}/snapshot")
async def create_snapshot(
    node: str,
    vmid: int,
    snap_request: SnapRequest,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
    db: AsyncSession = Depends(get_db),
):
    if not snap_request.snapname.strip():
        raise HTTPException(status_code=400, detail="Snapshot name cannot be empty")
    result = svc.create_snapshot(
        node,
        vmid,
        snap_request.snapname.strip(),
        snap_request.description,
        snap_request.vmstate,
        csrf_token,
        ticket,
    )
    try:
        await log_action(db, action="snapshot_create", node=node, vmid=vmid,
                         details={"snapname": snap_request.snapname.strip()})
    except Exception as e:
        logger.warning(f"Audit log failed for snapshot_create: {e}")
    return result

@app.post("/vm/{node}/qemu/{vmid}/snapshot/{snapname}/revert")
async def revert_snapshot(
    node: str,
    vmid: int,
    snapname: str,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.revert_snapshot(node, vmid, snapname, csrf_token, ticket)
    try:
        await log_action(db, action="snapshot_revert", node=node, vmid=vmid,
                         details={"snapname": snapname})
    except Exception as e:
        logger.warning(f"Audit log failed for snapshot_revert: {e}")
    return result

@app.delete("/vm/{node}/qemu/{vmid}/snapshot/{snapname}")
async def delete_snapshot(
    node: str,
    vmid: int,
    snapname: str,
    csrf_token: str,
    ticket: str,
    svc: SnapshotService = Depends(get_snapshot_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.delete_snapshot(node, vmid, snapname, csrf_token, ticket)
    try:
        await log_action(db, action="snapshot_delete", node=node, vmid=vmid,
                         details={"snapname": snapname})
    except Exception as e:
        logger.warning(f"Audit log failed for snapshot_delete: {e}")
    return result

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

@app.post("/vm/{node}/upload-iso")
async def upload_iso(
    node: str,
    csrf_token: str,
    ticket: str,
    file: UploadFile = File(...),
    svc: VMService = Depends(get_vm_service),
):
    if not file.filename or not file.filename.lower().endswith('.iso'):
        raise HTTPException(status_code=400, detail="Only .iso files are allowed")
    content = await file.read()
    return svc.upload_iso(node, file.filename, content, csrf_token, ticket)


@app.post("/vm/{node}")
async def create_vm(
    node: str,
    vm_create: VMCreateRequest,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.create_vm(node, vm_create, csrf_token, ticket)
    try:
        await log_action(db, action="vm_create", node=node,
                         details={"name": vm_create.name, "cpus": vm_create.cpus, "ram": vm_create.ram})
    except Exception as e:
        logger.warning(f"Audit log failed for vm_create: {e}")
    return result

@app.post("/vm/{node}/qemu/{vmid}/add-disk")
async def add_disk(
    node: str,
    vmid: int,
    req: VMDiskAddRequest,
    csrf_token: str,
    ticket: str,
    svc: DiskService = Depends(get_disk_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.add_disk(node, vmid, req, csrf_token, ticket)
    try:
        await log_action(db, action="disk_add", node=node, vmid=vmid,
                         details={"storage": req.storage, "size": req.size, "controller": req.controller})
    except Exception as e:
        logger.warning(f"Audit log failed for disk_add: {e}")
    return result

@app.delete("/vm/{node}/qemu/{vmid}/disk/{disk_key}")
async def delete_disk(
    node: str,
    vmid: int,
    disk_key: str,
    csrf_token: str,
    ticket: str,
    svc: DiskService = Depends(get_disk_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.delete_disk(node, vmid, disk_key, csrf_token, ticket)
    try:
        await log_action(db, action="disk_delete", node=node, vmid=vmid,
                         details={"disk_key": disk_key})
    except Exception as e:
        logger.warning(f"Audit log failed for disk_delete: {e}")
    return result

@app.post("/vm/{node}/qemu/{vmid}/activate-unused-disk/{unused_key}")
async def activate_unused_disk(
    node: str,
    vmid: int,
    unused_key: str,
    csrf_token: str,
    ticket: str,
    target_controller: str = "scsi",
    svc: DiskService = Depends(get_disk_service),
    db: AsyncSession = Depends(get_db),
):
    result = await svc.activate_unused_disk(node, vmid, unused_key, target_controller, csrf_token, ticket)
    try:
        await log_action(db, action="disk_activate", node=node, vmid=vmid,
                         details={"unused_key": unused_key, "target_controller": target_controller})
    except Exception as e:
        logger.warning(f"Audit log failed for disk_activate: {e}")
    return result

@app.delete("/vm/{node}/qemu/{vmid}")
async def delete_vm(
    node: str,
    vmid: int,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
    db: AsyncSession = Depends(get_db),
):
    result = svc.delete_vm(node, vmid, csrf_token, ticket)
    try:
        await log_action(db, action="vm_delete", node=node, vmid=vmid)
    except Exception as e:
        logger.warning(f"Audit log failed for vm_delete: {e}")
    return result

@app.post("/vm/{node}/qemu/{vmid}/{action}")
async def control_vm(
    node: str,
    vmid: int,
    action: str,
    csrf_token: str,
    ticket: str,
    svc: VMService = Depends(get_vm_service),
    db: AsyncSession = Depends(get_db),
):
    # Convert hibernate to suspend
    if action == "hibernate":
        action = "suspend"

    if action not in ["start", "stop", "shutdown", "reboot", "suspend", "resume"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    result = svc.vm_action(node, vmid, action, csrf_token, ticket)
    try:
        await log_action(db, action=f"vm_{action}", node=node, vmid=vmid)
    except Exception as e:
        logger.warning(f"Audit log failed for vm_{action}: {e}")
    return result

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
    db: AsyncSession = Depends(get_db),
):
    result = svc.expand_disk(node, vmid, disk_key, req.new_size, csrf_token, ticket)
    try:
        await log_action(db, action="disk_expand", node=node, vmid=vmid,
                         details={"disk_key": disk_key, "new_size_gb": req.new_size})
    except Exception as e:
        logger.warning(f"Audit log failed for disk_expand: {e}")
    return result

@app.delete("/vm/{node}/qemu/{vmid}/network")
async def remove_network_interface(
    node: str,
    vmid: int,
    nic: str = Query(...),
    csrf_token: str = Query(...),
    ticket: str = Query(...),
    svc: VMService = Depends(get_vm_service),
    db: AsyncSession = Depends(get_db),
):
    if not nic:
        raise HTTPException(status_code=400, detail="NIC name is required")
    try:
        result = svc.modify_vm_network(node, vmid, net=None, delete=nic, csrf_token=csrf_token, ticket=ticket)
        try:
            await log_action(db, action="nic_remove", node=node, vmid=vmid, details={"nic": nic})
        except Exception as e:
            logger.warning(f"Audit log failed for nic_remove: {e}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/vm/{node}/qemu/{vmid}/network")
async def update_network_interface(
    node: str,
    vmid: int,
    config: dict = Body(...),
    csrf_token: str = Query(...),
    ticket: str = Query(...),
    svc: VMService = Depends(get_vm_service),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = svc.modify_vm_network(node, vmid, net=config, delete=None, csrf_token=csrf_token, ticket=ticket)
        try:
            await log_action(db, action="nic_update", node=node, vmid=vmid, details={"config": config})
        except Exception as e:
            logger.warning(f"Audit log failed for nic_update: {e}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── DB-backed endpoints ───────────────────────────────────────────────────────

class VMMetadataRequest(BaseModel):
    notes: str = None
    tags: str = None

class DiskMetadataRequest(BaseModel):
    disk_uuid: str = None
    disk_type: str = None
    note: str = None

@app.get("/vm/{node}/{vmid}/metadata")
async def get_vm_metadata_endpoint(
    node: str,
    vmid: int,
    db: AsyncSession = Depends(get_db),
):
    meta = await get_vm_metadata(db, node, vmid)
    if meta is None:
        return {"node": node, "vmid": vmid, "notes": None, "tags": None}
    return {"node": node, "vmid": vmid, "notes": meta.notes, "tags": meta.tags, "updated_at": meta.updated_at}

@app.put("/vm/{node}/{vmid}/metadata")
async def set_vm_metadata_endpoint(
    node: str,
    vmid: int,
    body: VMMetadataRequest,
    db: AsyncSession = Depends(get_db),
):
    meta = await upsert_vm_metadata(db, node, vmid, notes=body.notes, tags=body.tags)
    return {"node": node, "vmid": vmid, "notes": meta.notes, "tags": meta.tags, "updated_at": meta.updated_at}

@app.get("/audit-log")
async def get_audit_log_endpoint(
    vmid: int = None,
    node: str = None,
    action: str = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    logs = await get_audit_logs(db, vmid=vmid, node=node, action=action, limit=limit, offset=offset)
    return [
        {
            "id": entry.id,
            "action": entry.action,
            "node": entry.node,
            "vmid": entry.vmid,
            "username": entry.username_snapshot,
            "details": entry.details,
            "status": entry.status,
            "error_message": entry.error_message,
            "timestamp": entry.timestamp,
        }
        for entry in logs
    ]

@app.get("/vm/{node}/{vmid}/disk/{disk_key}/metadata")
async def get_disk_metadata_endpoint(
    node: str,
    vmid: int,
    disk_key: str,
    db: AsyncSession = Depends(get_db),
):
    meta = await get_disk_metadata(db, vmid, disk_key)
    if meta is None:
        return {"vmid": vmid, "node": node, "disk_key": disk_key, "disk_uuid": None, "disk_type": None, "note": None}
    return {
        "vmid": meta.vmid, "node": meta.node, "disk_key": meta.disk_key,
        "disk_uuid": meta.disk_uuid, "disk_type": meta.disk_type,
        "note": meta.note, "updated_at": meta.updated_at,
    }

@app.put("/vm/{node}/{vmid}/disk/{disk_key}/metadata")
async def set_disk_metadata_endpoint(
    node: str,
    vmid: int,
    disk_key: str,
    body: DiskMetadataRequest,
    db: AsyncSession = Depends(get_db),
):
    meta = await upsert_disk_metadata(db, vmid=vmid, node=node, disk_key=disk_key,
                                      disk_uuid=body.disk_uuid, disk_type=body.disk_type, note=body.note)
    return {
        "vmid": meta.vmid, "node": meta.node, "disk_key": meta.disk_key,
        "disk_uuid": meta.disk_uuid, "disk_type": meta.disk_type,
        "note": meta.note, "updated_at": meta.updated_at,
    }


# ── User management endpoints ─────────────────────────────────────────────────

import hashlib

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "viewer"

class UpdateUserRequest(BaseModel):
    role: str

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).order_by(AppUser.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "last_login": u.last_login,
        }
        for u in users
    ]

@app.post("/users", status_code=201)
async def create_user(body: CreateUserRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=409, detail=f"Username '{body.username}' already exists.")
    if body.role not in ("viewer", "operator", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, operator, or admin.")
    user = await create_app_user(db, body.username, _hash_password(body.password), body.role)
    return {"id": user.id, "username": user.username, "role": user.role, "is_active": user.is_active}

@app.patch("/users/{user_id}")
async def update_user_role(user_id: int, body: UpdateUserRequest, db: AsyncSession = Depends(get_db)):
    if body.role not in ("viewer", "operator", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, operator, or admin.")
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.execute(sa_update(AppUser).where(AppUser.id == user_id).values(role=body.role))
    return {"id": user_id, "role": body.role}

@app.delete("/users/{user_id}", status_code=204)
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await db.execute(sa_update(AppUser).where(AppUser.id == user_id).values(is_active=False))


# ── Helpers file server ───────────────────────────────────────────────────────

HELPERS_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "helpers")

@app.get("/helpers/{category}/{filename}")
async def get_helper_file(category: str, filename: str):
    """Serve a file from the helpers/ directory (cloud-init scripts, templates, etc.)."""
    safe_cat  = os.path.basename(category)
    safe_file = os.path.basename(filename)
    path = os.path.join(HELPERS_ROOT, safe_cat, safe_file)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"Helper file not found: {category}/{filename}")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return {"category": safe_cat, "filename": safe_file, "content": content}

@app.get("/helpers/{category}")
async def list_helper_files(category: str):
    """List available files in a helpers sub-directory."""
    safe_cat = os.path.basename(category)
    path = os.path.join(HELPERS_ROOT, safe_cat)
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail=f"Helper category not found: {category}")
    files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
    return {"category": safe_cat, "files": sorted(files)}


# ── Disk-clone endpoint ───────────────────────────────────────────────────────

class DiskCloneRequest(BaseModel):
    disk_key: str = "scsi0"       # which disk key to clone (e.g. scsi0)
    target_storage: str           # Proxmox storage ID to copy into
    save_path: str = ""           # optional dest path hint (informational / future use)

@app.post("/vm/{node}/qemu/{vmid}/clone-disk")
async def clone_disk(
    node: str,
    vmid: int,
    req: DiskCloneRequest,
    csrf_token: str,
    ticket: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Copy a single VM disk to a target Proxmox storage.

    Strategy:
      1. GET the VM config to resolve the source volume ID for the requested disk key.
      2. GET /cluster/nextid to obtain a free VMID for the clone shell.
      3. POST /nodes/{node}/qemu/{vmid}/clone  with full=1 and storage=<target_storage>
         so Proxmox physically copies the disk data.
      The resulting VM can be treated as a disk-only template or deleted after
      extracting the volume.
    """
    import requests as _requests

    proxmox_base = (
        f"https://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}"
        f":{os.getenv('PROXMOX_PORT', '8006')}/api2/json"
    )
    session = _requests.Session()
    session.verify = False
    session.cookies.set("PVEAuthCookie", ticket)
    headers = {"CSRFPreventionToken": csrf_token}

    # 1. Verify disk key exists in VM config
    cfg_resp = session.get(f"{proxmox_base}/nodes/{node}/qemu/{vmid}/config")
    if cfg_resp.status_code != 200:
        raise HTTPException(status_code=cfg_resp.status_code, detail="Failed to fetch VM config")
    cfg = cfg_resp.json().get("data", {})
    if req.disk_key not in cfg:
        raise HTTPException(status_code=400, detail=f"Disk '{req.disk_key}' not found in VM config")

    # 2. Get next available VMID
    next_resp = session.get(f"{proxmox_base}/cluster/nextid")
    if next_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not obtain next VMID from Proxmox")
    new_vmid = int(next_resp.json().get("data", 0))
    if not new_vmid:
        raise HTTPException(status_code=500, detail="Invalid VMID returned by Proxmox")

    vm_name = cfg.get("name", f"vm-{vmid}")
    clone_name = f"disk-clone-{vm_name}-{req.disk_key}"[:63]  # Proxmox name limit

    # 3. Clone VM (Proxmox copies the disk to target_storage)
    clone_payload = {
        "newid":   new_vmid,
        "name":    clone_name,
        "full":    1,
        "storage": req.target_storage.strip(),
        "target":  node,
    }
    clone_resp = session.post(
        f"{proxmox_base}/nodes/{node}/qemu/{vmid}/clone",
        data=clone_payload,
        headers=headers,
    )
    if clone_resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=clone_resp.status_code,
            detail=f"Proxmox disk clone failed: {clone_resp.text}",
        )

    upid = clone_resp.json().get("data", "")
    try:
        await log_action(db, action="disk_clone", node=node, vmid=vmid,
                         details={"disk_key": req.disk_key, "target_storage": req.target_storage,
                                  "new_vmid": new_vmid, "clone_name": clone_name})
    except Exception as e:
        logger.warning(f"Audit log failed for disk_clone: {e}")

    return {
        "upid":       upid,
        "new_vmid":   new_vmid,
        "clone_name": clone_name,
        "disk_key":   req.disk_key,
        "storage":    req.target_storage,
    }


# ── Storage management endpoints ──────────────────────────────────────────────

class CreateStorageRequest(BaseModel):
    storage_id: str
    path: str
    content: str        # comma-separated Proxmox content types, e.g. "images,iso"
    node: str = None    # optional: restrict storage to a specific node

@app.post("/storage")
async def create_storage(
    req: CreateStorageRequest,
    csrf_token: str,
    ticket: str,
    db: AsyncSession = Depends(get_db),
):
    """Create a new directory-type storage in Proxmox."""
    import requests as _requests
    proxmox_base = (
        f"https://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}"
        f":{os.getenv('PROXMOX_PORT', '8006')}/api2/json"
    )
    session = _requests.Session()
    session.verify = False
    session.cookies.set("PVEAuthCookie", ticket)
    headers = {"CSRFPreventionToken": csrf_token}

    payload: dict = {
        "storage": req.storage_id.strip(),
        "type": "dir",
        "path": req.path.strip(),
        "content": req.content,
    }
    if req.node:
        payload["nodes"] = req.node.strip()

    resp = session.post(f"{proxmox_base}/storage", data=payload, headers=headers)
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Proxmox storage creation failed: {resp.text}",
        )

    try:
        await log_action(db, action="storage_create",
                         details={"storage_id": req.storage_id, "path": req.path,
                                  "content": req.content, "node": req.node})
    except Exception as e:
        logger.warning(f"Audit log failed for storage_create: {e}")

    return resp.json().get("data", {}) or {"storage": req.storage_id, "path": req.path}

@app.get("/storage/{node}")
async def list_storage(
    node: str,
    csrf_token: str,
    ticket: str,
):
    """List all storage pools visible to a node."""
    import requests as _requests
    proxmox_base = (
        f"https://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}"
        f":{os.getenv('PROXMOX_PORT', '8006')}/api2/json"
    )
    session = _requests.Session()
    session.verify = False
    session.cookies.set("PVEAuthCookie", ticket)
    resp = session.get(f"{proxmox_base}/nodes/{node}/storage")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json().get("data", [])


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
