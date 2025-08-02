import re
import requests
from fastapi import HTTPException
from typing import Dict, List, Any
from .agent_service import AgentService
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
        return response.json()["data"]

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
            vm["hdd_free"] = vm["ip_address"] = "N/A"

            if vm["status"] == "running":
                vm["hdd_free"] = agent_service.get_fsinfo(node, vm["vmid"], csrf_token, ticket)
                vm["ip_address"] = agent_service.get_ip_addresses(node, vm["vmid"], csrf_token, ticket)

        return vms

    def vm_action(self, node: str, vmid: int, action: str, csrf_token: str, ticket: str) -> Any:
        if action not in ["start", "stop", "shutdown", "reboot", "hibernate", "resume"]:
            raise HTTPException(status_code=400, detail="Invalid action")

        self.session.cookies.set("PVEAuthCookie", ticket)
        headers = {"CSRFPreventionToken": csrf_token}

        if action == "hibernate":
            action = "suspend"

        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers=headers
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json().get("data")

    def get_vm_status(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.session.cookies.set("PVEAuthCookie", ticket)
        headers = {"CSRFPreventionToken": csrf_token}
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/current",
            headers=headers
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get VM status")
        return response.json()["data"]["status"]
