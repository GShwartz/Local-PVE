# main.py (updated to import from Modules)
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

from Modules.models import LoginRequest, AuthResponse
from Modules.proxmox_service import ProxmoxService

app = FastAPI(title="Proxmox Controller API")

# CORS for frontend (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for service (injectable for testing/scaling)
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

@app.post("/vm/{node}/{vmid}/{action}")
async def control_vm(node: str, vmid: int, action: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    if action not in ["start", "stop", "shutdown", "reboot", "hibernate"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    return service.vm_action(node, vmid, action, csrf_token, ticket)

@app.get("/task/{node}/{upid}")
async def get_task_status(node: str, upid: str, csrf_token: str, ticket: str, service: ProxmoxService = Depends(get_proxmox_service)):
    return service.get_task_status(node, upid, csrf_token, ticket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)