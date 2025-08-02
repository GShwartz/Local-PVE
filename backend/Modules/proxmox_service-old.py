# proxmox_service.py
import requests
import os
from typing import Dict, Any, List, Optional
import urllib3
import re
import logging
from fastapi import HTTPException, status
import logging.handlers
from .models import VMCreateRequest, VMUpdateRequest, VMCloneRequest, VMDiskAddRequest
import httpx
from typing import Optional

# Configure logging to console and file
log_file = os.path.join(os.path.dirname(__file__), 'proxmox_service.log')
handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.basicConfig(level=logging.INFO, handlers=[handler, logging.StreamHandler()])
logger = logging.getLogger(__name__)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PROXMOX_HOST = "pve.home.lab:8006"
PROXMOX_BASE_URL = f"https://{PROXMOX_HOST}/api2/json"

class ProxmoxService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def login(self, username: str, password: str) -> Dict[str, str]:
        try:
            logger.info(f"Attempting login with username: {username}")
            response = self.session.post(
                f"{PROXMOX_BASE_URL}/access/ticket",
                data={"username": username, "password": password}
            )
            response.raise_for_status()
            data = response.json()["data"]
            self.session.cookies.set("PVEAuthCookie", data["ticket"])
            logger.info("Login successful for user: %s", username)
            return {"ticket": data["ticket"], "csrf_token": data["CSRFPreventionToken"]}
        except requests.exceptions.HTTPError:
            logger.error("Proxmox login failed: Status %d, Response: %s",
                         response.status_code, response.text)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Proxmox login failed: {response.text}"
            )
        except Exception as e:
            logger.error("Unexpected error during login: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_nodes(self, csrf_token: str, ticket: str) -> List[Any]:
        self.set_auth_cookie(ticket)
        logger.info("Fetching nodes")
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes")
        if response.status_code != 200:
            logger.error("Failed to fetch nodes: Status %d, Response: %s",
                         response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch nodes")
        return response.json()["data"]

    def get_vm_config(self, node: str, vmid: int, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching VM config for vmid {vmid} on node {node}")
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config"
        )
        if response.status_code != 200:
            logger.error("Failed to fetch VM config for vmid %d: Status %d, Response: %s",
                         vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM config")
        return response.json()["data"]

    def get_vm_status(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching VM status for vmid {vmid} on node {node}")
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/current",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to fetch VM status for vmid %d: Status %d, Response: %s",
                         vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM status")
        return response.json()["data"]["status"]

    def get_snapshots(self, node: str, vmid: int, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching snapshots for vmid {vmid} on node {node}")
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to fetch snapshots for vmid %d: Status %d, Response: %s",
                         vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch snapshots")
        snapshots = response.json()["data"]
        return [
            {"name": snap["name"], "description": snap.get("description", ""), "snaptime": snap.get("snaptime")}
            for snap in snapshots
            if snap["name"] != "current"
        ]

    def revert_snapshot(self, node: str, vmid: int, snapname: str,
                        csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Reverting snapshot {snapname} for vmid {vmid} on node {node}")
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}/rollback",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to revert snapshot %s for vmid %d: Status %d, Response: %s",
                         snapname, vmid, response.status_code, response.text)
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to revert snapshot {snapname}: {response.text}"
            )
        logger.info(f"Snapshot revert response: {response.json()['data']}")
        return response.json()["data"]

    def delete_snapshot(self, node: str, vmid: int, snapname: str,
                        csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Deleting snapshot {snapname} for vmid {vmid} on node {node}")
        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to delete snapshot %s for vmid %d: Status %d, Response: %s",
                         snapname, vmid, response.status_code, response.text)
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to delete snapshot {snapname}: {response.text}"
            )
        logger.info(f"Snapshot delete response: {response.json()['data']}")
        return response.json()["data"]

    def create_snapshot(self, node: str, vmid: int, snapname: str,
                        description: str, vmstate: int,
                        csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        endpoint = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot"
        logger.info(
            f"Creating snapshot '{snapname}' for vmid {vmid} on node {node} "
            f"at {endpoint} with description '{description}' and vmstate {vmstate}"
        )
        try:
            response = self.session.post(
                endpoint,
                data={
                    "snapname": snapname,
                    "description": description,
                    "vmstate": str(vmstate),
                },
                headers={"CSRFPreventionToken": csrf_token}
            )
            response.raise_for_status()
            logger.info(f"Snapshot created successfully: {response.json()['data']}")
            return response.json()["data"]
        except requests.exceptions.HTTPError:
            err = response.text
            try:
                j = response.json()
                err = j.get("errors", {}).get("snapname", j.get("data", err))
            except ValueError:
                pass
            logger.error("Snapshot creation failed: %s", err)
            raise HTTPException(status_code=400, detail=f"Failed to create snapshot '{snapname}': {err}")
        except Exception as e:
            logger.error("Unexpected error creating snapshot '%s': %s", snapname, str(e))
            raise HTTPException(status_code=500, detail=str(e))

    def update_vm_config(self, node: str, vmid: int, updates: VMUpdateRequest,
                         csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        endpoint = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config"
        logger.info(f"Updating VM config for vmid {vmid} on node {node}: {updates}")
        if updates.cpus is not None or updates.ram is not None:
            if self.get_vm_status(node, vmid, csrf_token, ticket) == "running":
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
        try:
            response = self.session.post(endpoint, data=data,
                                         headers={"CSRFPreventionToken": csrf_token})
            response.raise_for_status()
            return response.json()["data"]
        except requests.exceptions.HTTPError:
            err = response.text
            try:
                err = response.json().get("errors", {}).get("data", err)
            except ValueError:
                pass
            raise HTTPException(status_code=response.status_code, detail=err)

    def execute_agent_command(self, node: str, vmid: int, command: str,
                              csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": command},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code == 200:
            return response.json().get("data")
        return None

    def get_vms(self, node: str, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.set_auth_cookie(ticket)
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu")
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
            disks: List[str] = []
            for k, v in config.items():
                if any(k.startswith(p) for p in ("ide", "sata", "scsi", "virtio")) and "cdrom" not in v:
                    m = re.search(r"size=(\d+[KMGT]?)", v)
                    if m:
                        disks.append(m.group(1))
            vm["num_hdd"] = len(disks)
            vm["hdd_sizes"] = ", ".join(disks) if disks else "N/A"
            vm["hdd_free"] = vm["ip_address"] = "N/A"
            if vm["status"] == "running":
                fs = self.execute_agent_command(node, vm["vmid"], "get-fsinfo", csrf_token, ticket)
                if isinstance(fs, list):
                    vm["hdd_free"] = ", ".join(
                        f"{(f['total-bytes']-f['used-bytes'])/(1024**3):.2f} GB" for f in fs
                    )
                net = self.execute_agent_command(node, vm["vmid"], "network-get-interfaces", csrf_token, ticket)
                if isinstance(net, dict) and "result" in net:
                    ips = [
                        ip["ip-address"]
                        for iface in net["result"]
                        for ip in iface.get("ip-addresses", [])
                        if ip.get("ip-address-type") == "ipv4"
                    ]
                    vm["ip_address"] = ", ".join(ips) if ips else "No IPv4"
        return vms

    def vm_action(self, node: str, vmid: int, action: str,
                  csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        if action == "hibernate":
            action = "suspend"
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers={"CSRFPreventionToken": csrf_token}
        )
        response.raise_for_status()
        return response.json().get("data")

    def get_task_status(self, node: str, upid: str,
                        csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/tasks/{upid}/status",
            headers={"CSRFPreventionToken": csrf_token}
        )
        response.raise_for_status()
        return response.json().get("data")

    def create_vm(self, node: str, vm_create: VMCreateRequest,
                  csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        response = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        response.raise_for_status()
        vmid = response.json().get("data")
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
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu",
            data=data,
            headers={"CSRFPreventionToken": csrf_token}
        )
        response.raise_for_status()
        return response.json().get("data")

    def get_vnc_proxy(self, node: str, vmid: int,
                      csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy",
            data={"websocket": 1},
            headers={"CSRFPreventionToken": csrf_token}
        )
        response.raise_for_status()
        return response.json().get("data")

    def clone_vm(self, node: str, vmid: int, clone_req: VMCloneRequest,
                 csrf_token: str, ticket: str) -> Optional[str]:
        """
        Clone an existing VM. Supports full (clone_req.full=True) or linked clone.
        """
        self.set_auth_cookie(ticket)
        # fetch next VMID for the clone
        resp = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        resp.raise_for_status()
        new_id = resp.json().get("data")

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
        except Exception:
            # return None on failure
            return None
    
    def delete_vm(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Deleting VM {vmid} on node {node} with purge=1 and destroy-unreferenced-disks=1")

        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}",
            params={
                "purge": 1,
                "destroy-unreferenced-disks": 1
            },
            headers={"CSRFPreventionToken": csrf_token}
        )

        if response.status_code != 200:
            logger.error("Failed to delete VM %d: Status %d, Response: %s",
                        vmid, response.status_code, response.text)
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to delete VM {vmid}: {response.text}"
            )

        return response.json().get("data")
    
    def add_disk(self, node: str, vmid: int, req, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        disk_id = f"{req.controller}{req.bus}"
        value = f"{req.storage}:{req.size},format=qcow2,media=disk,size={req.size}G"
        payload = {disk_id: value}

        cookies = {"PVEAuthCookie": ticket}
        response = httpx.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data=payload,
            headers={"CSRFPreventionToken": csrf_token},
            cookies=cookies,
            verify=False,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json().get("data", "Disk added")

    async def activate_unused_disk(
        self,
        node: str,
        vmid: int,
        unused_key: str,
        target_controller: str,
        csrf_token: str,
        ticket: str,
    ) -> dict:
        headers = {
            "CSRFPreventionToken": csrf_token,
            "Content-Type": "application/x-www-form-urlencoded",
        }
        cookies = {"PVEAuthCookie": ticket}

        async with httpx.AsyncClient(verify=False) as client:
            config_resp = await client.get(
                f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
                headers=headers,
                cookies=cookies,
            )
            if config_resp.status_code != 200:
                raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

            config = config_resp.json().get("data", {})
            if unused_key not in config:
                available = [k for k in config if k.startswith("unused")]
                raise HTTPException(status_code=404, detail=f"Unused disk '{unused_key}' not found. Available: {available}")

            volume_path = config[unused_key].strip()
            used_slots = [
                int(m.group()) for k in config
                if k.startswith(target_controller) and (m := re.search(r'\d+$', k))
            ]
            slot = 0
            while slot in used_slots:
                slot += 1
            target_key = f"{target_controller}{slot}"

            # Format the correct controller assignment string
            disk_value = f"file={volume_path},media=disk,format=qcow2,ssd=1"

            payload = {
                target_key: disk_value,
            }

            resp = await client.post(
                f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
                headers=headers,
                cookies=cookies,
                data=payload,
            )

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)

            return {
                "success": True,
                "message": f"Moved {unused_key} to {target_key}",
                "target_key": target_key,
                "data": resp.json(),
            }