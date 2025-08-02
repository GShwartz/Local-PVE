# vm_service.py

import re
import requests
from fastapi import HTTPException
from typing import Dict, List, Any, Optional
from .agent_service import AgentService
from Modules.models import VMCreateRequest, VMUpdateRequest, VMCloneRequest
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"
agent_service = AgentService()

class VMService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def set_auth_headers(self, csrf_token: str, ticket: str) -> Dict[str, str]:
        self.session.cookies.set("PVEAuthCookie", ticket)
        return {"CSRFPreventionToken": csrf_token}

    def get_vm_config(self, node: str, vmid: int, ticket: str) -> Dict[str, Any]:
        self.session.cookies.set("PVEAuthCookie", ticket)
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM config")
        return response.json().get("data", {})

    def get_vm_status(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        headers = self.set_auth_headers(csrf_token, ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/current",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get VM status")
        return response.json().get("data", {}).get("status", "")

    def get_vms(self, node: str, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        headers = self.set_auth_headers(csrf_token, ticket)
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu", headers=headers)
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Proxmox authentication failed: invalid ticket")
        response.raise_for_status()

        vms = response.json().get("data", [])
        for vm in vms:
            config = self.get_vm_config(node, vm["vmid"], ticket)
            vm.update({
                "cpus": int(config.get("cores", 0)),
                "ram": int(config.get("memory", 0)),
                "name": config.get("name", f"VM {vm['vmid']}"),
                "status": vm.get("status", "stopped"),
                "os": "Windows" if "win" in config.get("ostype", "").lower() else "Linux"
            })

            disks = []
            for k, v in config.items():
                if any(k.startswith(p) for p in ("ide", "sata", "scsi", "virtio")) and "cdrom" not in v:
                    match = re.search(r"size=(\d+[KMGT]?)", v)
                    if match:
                        disks.append(match.group(1))
            vm["num_hdd"] = len(disks)
            vm["hdd_sizes"] = ", ".join(disks) if disks else "N/A"
            vm["hdd_free"] = "N/A"
            vm["ip_address"] = "N/A"

            if vm["status"] == "running":
                vm["hdd_free"] = agent_service.get_fsinfo(node, vm["vmid"], csrf_token, ticket)
                vm["ip_address"] = agent_service.get_ip_addresses(node, vm["vmid"], csrf_token, ticket)
        return vms

    def vm_action(self, node: str, vmid: int, action: str, csrf_token: str, ticket: str) -> Any:
        valid_actions = ["start", "stop", "shutdown", "reboot", "hibernate", "resume"]
        if action not in valid_actions:
            raise HTTPException(status_code=400, detail="Invalid action")
        if action == "hibernate":
            action = "suspend"

        headers = self.set_auth_headers(csrf_token, ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data")

    def create_vm(self, node: str, vm_create: VMCreateRequest, csrf_token: str, ticket: str) -> Any:
        self.session.cookies.set("PVEAuthCookie", ticket)
        # Get next available VMID
        resp_id = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        resp_id.raise_for_status()
        vmid = resp_id.json().get("data")

        data = {
            "vmid": vmid,
            "name": vm_create.name,
            "cores": vm_create.cpus,
            "memory": vm_create.ram,
            "net0": "virtio,bridge=vmbr0",
            "agent": 1,
            "ostype": "l26",
            "scsi0": "local-lvm:32"
        }
        if vm_create.source == "ISO":
            data["ide2"] = "local:iso/ubuntu-22.04.3-live-server-amd64.iso,media=cdrom"
            data["boot"] = "order=ide2;scsi0;net0"
        else:
            data["boot"] = "order=scsi0;net0"

        headers = {"CSRFPreventionToken": csrf_token}
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu",
            data=data,
            headers=headers
        )
        response.raise_for_status()
        return response.json().get("data")

    def update_vm_config(self, node: str, vmid: int, updates: VMUpdateRequest, csrf_token: str, ticket: str) -> str:
        headers = self.set_auth_headers(csrf_token, ticket)
        # Prevent CPU/RAM updates on running VMs
        if (updates.cpus is not None or updates.ram is not None) and \
           self.get_vm_status(node, vmid, csrf_token, ticket) == "running":
            raise HTTPException(status_code=400, detail="Cannot update CPU or RAM while VM is running")

        data: Dict[str, Any] = {}
        if updates.name is not None:
            data["name"] = updates.name
        if updates.cpus is not None:
            data["cores"] = updates.cpus
        if updates.ram is not None:
            data["memory"] = updates.ram
        if not data:
            raise HTTPException(status_code=400, detail="No valid updates provided")

        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data=data,
            headers=headers
        )
        if response.status_code != 200:
            err = response.text
            try:
                err = response.json().get("errors", {}).get("data", err)
            except ValueError:
                pass
            raise HTTPException(status_code=response.status_code, detail=err)
        return response.json().get("data")

    def clone_vm(self, node: str, vmid: int, clone_req: VMCloneRequest, csrf_token: str, ticket: str) -> Optional[str]:
        self.session.cookies.set("PVEAuthCookie", ticket)
        # Fetch new VMID
        resp_id = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        resp_id.raise_for_status()
        new_id = resp_id.json().get("data")

        payload: Dict[str, Any] = {
            "newid": new_id,
            "name": clone_req.name,
            "full": int(clone_req.full),
            "target": clone_req.target
        }
        if clone_req.storage:
            payload["storage"] = clone_req.storage

        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/clone",
            data=payload,
            headers={"CSRFPreventionToken": csrf_token}
        )
        try:
            response.raise_for_status()
            return response.json().get("data")
        except requests.exceptions.HTTPError:
            return None

    def delete_vm(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        headers = self.set_auth_headers(csrf_token, ticket)
        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}",
            params={"purge": 1, "destroy-unreferenced-disks": 1},
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data")
