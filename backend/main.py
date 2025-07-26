from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from pydantic import BaseModel
from Modules.models import LoginRequest, AuthResponse
from Modules.proxmox_service import ProxmoxService

class SnapRequest(BaseModel):
    snapname: str
    description: str = ""
    vmstate: int = 0

app = FastAPI(title="Proxmox Controller API")

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

@app.get("/vm/{node}/{vmid}/status")
async def get_vm_status(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return {"status": service.get_vm_status(node, vmid, csrf_token, ticket)}

@app.get("/vm/{node}/{vmid}/snapshots")
async def list_snapshots(node: str, vmid: int, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_snapshots(node, vmid, csrf_token, ticket)

@app.post("/vm/{node}/{vmid}/snapshot")
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

@app.post("/vm/{node}/{vmid}/snapshot/{snapname}/revert")
async def revert_snapshot(node: str, vmid: int, snapname: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.revert_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.delete("/vm/{node}/{vmid}/snapshot/{snapname}")
async def delete_snapshot(node: str, vmid: int, snapname: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.delete_snapshot(node, vmid, snapname, csrf_token, ticket)

@app.post("/vm/{node}/{vmid}/{action}")
async def control_vm(node: str, vmid: int, action: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    if action not in ["start", "stop", "shutdown", "reboot", "hibernate", "resume"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    return service.vm_action(node, vmid, action, csrf_token, ticket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)