from Modules.models import VMCreateRequest, VMUpdateRequest, VMCloneRequest
from typing import Dict, List, Any, Optional
from .agent_service import AgentService
from Modules.logger import init_logger
from fastapi import HTTPException
import requests
import urllib3
import asyncio
import httpx
import re

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

class VMService:
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.logger = init_logger(log_file, __name__)
        self.agent_service = AgentService(self.log_file)
        self.session = requests.Session()
        self.session.verify = False

    def set_auth_headers(self, csrf_token: str, ticket: str) -> Dict[str, str]:
        self.logger.info("Setting authentication headers")
        self.session.cookies.set("PVEAuthCookie", ticket)
        return {"CSRFPreventionToken": csrf_token}

    def get_vm_config(self, node: str, vmid: int, ticket: str) -> Dict[str, Any]:
        self.logger.info(f"Fetching VM config for VM {vmid} on node {node}")
        self.session.cookies.set("PVEAuthCookie", ticket)
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config")
        self.logger.info(f"VM config response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to fetch VM config: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM config")
        
        return response.json().get("data", {})

    def get_vm_status(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Getting status for VM {vmid} on node {node}")
        headers = self.set_auth_headers(csrf_token, ticket)
        self.session.cookies.set("PVEAuthCookie", ticket)

        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/current",
            headers=headers
        )
        self.logger.info(f"VM status response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to get VM status: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to get VM status")
        
        return response.json().get("data", {}).get("status", "")

    async def get_vms(self, node: str, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.logger.info(f"Fetching VMs on node {node}")
        base_url = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu"
        headers = {"CSRFPreventionToken": csrf_token}
        cookies = {"PVEAuthCookie": ticket}

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                r = await client.get(base_url, headers=headers, cookies=cookies)
                r.raise_for_status()
                vms = r.json().get("data", [])
            except Exception as e:
                self.logger.error(f"Failed to fetch base VM list: {str(e)}")
                return []

            async def fetch_vm_data(vm):
                vmid = vm["vmid"]
                config_url = f"{base_url}/{vmid}/config"
                status_url = f"{base_url}/{vmid}/status/current"

                try:
                    config_res, status_res = await asyncio.gather(
                        client.get(config_url, headers=headers, cookies=cookies),
                        client.get(status_url, headers=headers, cookies=cookies)
                    )

                    config = config_res.json().get("data", {})
                    status_data = status_res.json().get("data", {})
                    status = status_data.get("status", "stopped")

                    disks = []
                    for k, v in config.items():
                        if any(k.startswith(p) for p in ("ide", "sata", "scsi", "virtio")) and "cdrom" not in v:
                            match = re.search(r"size=(\d+[KMGT]?)", v)
                            if match:
                                disks.append(match.group(1))

                    vm.update({
                        "cpus": int(config.get("cores", 0)),
                        "ram": int(config.get("memory", 0)),
                        "name": config.get("name", f"VM {vmid}"),
                        "status": status,
                        "os": "Windows" if "win" in config.get("ostype", "").lower() else "Linux",
                        "num_hdd": len(disks),
                        "hdd_sizes": ", ".join(disks) if disks else "N/A",
                        "ip_address": "N/A",
                        "hdd_free": "N/A",
                    })

                    if status == "running":
                        ip_task = self.agent_service.get_ip_addresses(client, node, vmid, csrf_token, ticket)
                        fs_task = self.agent_service.get_fsinfo(client, node, vmid, csrf_token, ticket)
                        ip_address, hdd_free = await asyncio.gather(ip_task, fs_task)
                        vm["ip_address"] = ip_address
                        vm["hdd_free"] = hdd_free

                except Exception as e:
                    self.logger.warning(f"Error enriching VM {vmid}: {str(e)}")

                return vm

            enriched_vms = await asyncio.gather(*(fetch_vm_data(vm) for vm in vms))
            return enriched_vms

    def vm_action(self, node: str, vmid: int, action: str, csrf_token: str, ticket: str) -> Any:
        self.logger.info(f"Performing action '{action}' on VM {vmid} on node {node}")

        if action == "hibernate":
            action = "suspend"

        valid_actions = ["start", "stop", "shutdown", "reboot", "suspend", "resume"]

        if action not in valid_actions:
            self.logger.error(f"Invalid action: {action}")
            raise HTTPException(status_code=400, detail="Invalid action")

        headers = self.set_auth_headers(csrf_token, ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers=headers,
            data={}  # <-- Added empty body so Proxmox accepts POST
        )
        self.logger.info(f"VM action response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to perform action '{action}' on VM {vmid}: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json().get("data")


    def create_vm(self, node: str, vm_create: VMCreateRequest, csrf_token: str, ticket: str) -> Any:
        self.logger.info(f"Creating VM on node {node} with request: {vm_create}")
        self.session.cookies.set("PVEAuthCookie", ticket)

        resp_id = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        self.logger.info(f"Next VMID response status code: {resp_id.status_code}")
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
        self.logger.info(f"VM creation data: {data}")

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
        self.logger.info(f"VM creation response status code: {response.status_code}")
        response.raise_for_status()

        return response.json().get("data")

    def update_vm_config(self, node: str, vmid: int, updates: VMUpdateRequest, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Updating VM {vmid} on node {node} with updates: {updates}")
        headers = self.set_auth_headers(csrf_token, ticket)

        if (updates.cpus is not None or updates.ram is not None) and \
           self.get_vm_status(node, vmid, csrf_token, ticket) == "running":
            self.logger.error("Cannot update CPU or RAM while VM is running")
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

        self.logger.info(f"VM update data: {data}")
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data=data,
            headers=headers
        )
        self.logger.info(f"VM update response status code: {response.status_code}")

        if response.status_code != 200:
            err = response.text
            try:
                err = response.json().get("errors", {}).get("data", err)
            except ValueError:
                pass

            self.logger.error(f"Failed to update VM {vmid}: {err}")
            raise HTTPException(status_code=response.status_code, detail=err)
        
        return response.json().get("data")

    def clone_vm(self, node: str, vmid: int, clone_req: VMCloneRequest, csrf_token: str, ticket: str) -> Optional[str]:
        self.logger.info(f"Cloning VM {vmid} on node {node} with request: {clone_req}")
        self.session.cookies.set("PVEAuthCookie", ticket)

        resp_id = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        resp_id.raise_for_status()
        new_id = resp_id.json().get("data")

        payload: Dict[str, Any] = {
            "newid": new_id,
            "name": clone_req.name,
            "full": int(clone_req.full),
            "target": clone_req.target
        }
        self.logger.info(f"Clone payload: {payload}")
        if clone_req.storage:
            payload["storage"] = clone_req.storage

        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/clone",
            data=payload,
            headers={"CSRFPreventionToken": csrf_token}
        )
        self.logger.info(f"Clone response status code: {response.status_code}")

        try:
            response.raise_for_status()
            self.logger.info(f"Clone successful, new VMID: {new_id}")
            return response.json().get("data")
        except requests.exceptions.HTTPError:
            self.logger.error(f"Failed to clone VM {vmid}: {response.text}")
            return None

    def delete_vm(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Deleting VM {vmid} on node {node}")
        headers = self.set_auth_headers(csrf_token, ticket)

        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}",
            params={"purge": 1, "destroy-unreferenced-disks": 1},
            headers=headers
        )
        self.logger.info(f"VM deletion response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to delete VM {vmid}: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        return response.json().get("data")
    
    def modify_vm_network(self, node: str, vmid: int, net: Optional[dict], delete: Optional[str], csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Modifying network for VM {vmid} on node {node} with net={net}, delete={delete}")
        headers = self.set_auth_headers(csrf_token, ticket)

        params = {}
        if delete:
            params["delete"] = delete
        if net:
            params.update(net)

        response = self.session.put(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data=params,
            headers=headers
        )

        self.logger.info(f"Modify network response status code: {response.status_code}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json().get("data")
