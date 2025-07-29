import requests
import os
from typing import Dict, Any, List
import urllib3
import re
import logging
from fastapi import HTTPException, status
import logging.handlers
from .models import VMCreateRequest, VMUpdateRequest

# Configure logging to console and file
log_file = os.path.join(os.path.dirname(__file__), 'proxmox_service.log')
handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logging.basicConfig(level=logging.INFO, handlers=[handler, logging.StreamHandler()])
logger = logging.getLogger(__name__)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PROXMOX_HOST = os.getenv("PROXMOX_HOST", "10.0.0.7:8006")
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
        except requests.exceptions.HTTPError as e:
            logger.error("Proxmox login failed: Status %d, Response: %s", response.status_code, response.text)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Proxmox login failed: {response.text}")
        except Exception as e:
            logger.error("Unexpected error during login: %s", str(e))
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_nodes(self, csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        logger.info("Fetching nodes")
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes")
        if response.status_code != 200:
            logger.error("Failed to fetch nodes: Status %d, Response: %s", response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch nodes")
        return response.json()["data"]

    def get_vm_config(self, node: str, vmid: int, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching VM config for vmid {vmid} on node {node}")
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config")
        if response.status_code != 200:
            logger.error("Failed to fetch VM config for vmid %d: Status %d, Response: %s", vmid, response.status_code, response.text)
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
            logger.error("Failed to fetch VM status for vmid %d: Status %d, Response: %s", vmid, response.status_code, response.text)
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
            logger.error("Failed to fetch snapshots for vmid %d: Status %d, Response: %s", vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch snapshots")
        snapshots = response.json()["data"]
        return [
            {
                "name": snap["name"],
                "description": snap.get("description", ""),
                "snaptime": snap.get("snaptime")
            }
            for snap in snapshots
            if snap["name"] != "current"
        ]

    def revert_snapshot(self, node: str, vmid: int, snapname: str, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Reverting snapshot {snapname} for vmid {vmid} on node {node}")
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}/rollback",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to revert snapshot %s for vmid %d: Status %d, Response: %s", snapname, vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail=f"Failed to revert snapshot {snapname}: {response.text}")
        logger.info(f"Snapshot revert response: {response.json()['data']}")
        return response.json()["data"]

    def delete_snapshot(self, node: str, vmid: int, snapname: str, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Deleting snapshot {snapname} for vmid {vmid} on node {node}")
        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to delete snapshot %s for vmid %d: Status %d, Response: %s", snapname, vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail=f"Failed to delete snapshot {snapname}: {response.text}")
        logger.info(f"Snapshot delete response: {response.json()['data']}")
        return response.json()["data"]

    def create_snapshot(self, node: str, vmid: int, snapname: str, description: str, vmstate: int, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        endpoint = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot"
        logger.info(f"Creating snapshot '{snapname}' for vmid {vmid} on node {node} at {endpoint} with description '{description}' and vmstate {vmstate}")
        try:
            response = self.session.post(
                endpoint,
                data={
                    "snapname": snapname,
                    "description": description,
                    "vmstate": str(vmstate)  # Convert to string for form data
                },
                headers={"CSRFPreventionToken": csrf_token}
            )
            response.raise_for_status()
            logger.info(f"Snapshot created successfully: Status {response.status_code}, Data: {response.json()['data']}")
            return response.json()["data"]
        except requests.exceptions.HTTPError as e:
            error_message = response.text
            try:
                error_json = response.json()
                error_message = error_json.get('errors', {}).get('snapname', error_json.get('data', response.text))
            except ValueError:
                pass
            logger.error(
                "Failed to create snapshot '%s' for vmid %d on node %s: Status %d, Endpoint: %s, Response: %s",
                snapname, vmid, node, response.status_code, endpoint, error_message
            )
            raise HTTPException(status_code=400, detail=f"Failed to create snapshot '{snapname}': {error_message}")
        except Exception as e:
            logger.error(
                "Unexpected error creating snapshot '%s' for vmid %d on node %s: Endpoint: %s, Error: %s",
                snapname, vmid, node, endpoint, str(e)
            )
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    def update_vm_config(self, node: str, vmid: int, updates: VMUpdateRequest, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        endpoint = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config"
        logger.info(f"Updating VM config for vmid {vmid} on node {node} with updates: {updates}")
        
        # Check VM status for CPU and RAM changes
        if updates.cpus is not None or updates.ram is not None:
            status = self.get_vm_status(node, vmid, csrf_token, ticket)
            if status == "running":
                logger.error("Cannot update CPU or RAM for running VM %d on node %s", vmid, node)
                raise HTTPException(status_code=400, detail="Cannot update CPU or RAM while VM is running")

        # Prepare data payload with only non-None fields
        data = {}
        if updates.name is not None:
            data["name"] = updates.name
        if updates.cpus is not None:
            data["cores"] = updates.cpus
        if updates.ram is not None:
            data["memory"] = updates.ram

        if not data:
            logger.warning("No valid updates provided for VM %d on node %s", vmid, node)
            raise HTTPException(status_code=400, detail="No valid updates provided")

        try:
            response = self.session.post(
                endpoint,
                data=data,
                headers={"CSRFPreventionToken": csrf_token}
            )
            response.raise_for_status()
            logger.info(f"VM config updated successfully for vmid {vmid}: Status {response.status_code}, Data: {response.json()['data']}")
            return response.json()["data"]
        except requests.exceptions.HTTPError as e:
            error_message = response.text
            try:
                error_json = response.json()
                error_message = error_json.get('errors', {}).get('data', response.text)
            except ValueError:
                pass
            logger.error(
                "Failed to update VM config for vmid %d on node %s: Status %d, Response: %s",
                vmid, node, response.status_code, error_message
            )
            raise HTTPException(status_code=response.status_code, detail=f"Failed to update VM config: {error_message}")
        except Exception as e:
            logger.error("Unexpected error updating VM config for vmid %d on node %s: %s", vmid, node, str(e))
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    def execute_agent_command(self, node: str, vmid: int, command: str, csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        logger.info(f"Executing agent command {command} for vmid {vmid} on node {node}")
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": command},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code == 200:
            return response.json().get("data")
        logger.warning("Agent command %s failed for vmid %d: Status %d, Response: %s", command, vmid, response.status_code, response.text)
        return None

    def get_vms(self, node: str, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching VMs for node {node}")
        response = self.session.get(f"{PROXMOX_BASE_URL}/nodes/{node}/qemu")
        if response.status_code != 200:
            logger.error("Failed to fetch VMs for node %s: Status %d, Response: %s", node, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VMs")
        raw_response = response.json()
        logger.info("Raw Proxmox QEMU response for node %s: %s", node, raw_response)
        vms = raw_response.get("data", [])
        logger.info("Fetched %d VMs for node %s: %s", len(vms), node, [vm.get("vmid") for vm in vms])

        for vm in vms:
            vmid = vm["vmid"]
            config = self.get_vm_config(node, vmid, ticket)
            vm["cpus"] = int(config.get("cores", 0))
            vm["ram"] = int(config.get("memory", 0))
            vm["name"] = config.get("name", f"VM {vmid}")
            vm["status"] = vm.get("status", "stopped")

            ostype = config.get("ostype", "unknown").lower()
            vm["os"] = 'Windows' if 'win' in ostype else 'Linux'

            disks = []
            disk_prefixes = ["ide", "sata", "scsi", "virtio"]
            for key, value in config.items():
                if any(key.startswith(prefix) for prefix in disk_prefixes) and "cdrom" not in value:
                    size_match = re.search(r'size=(\d+[KMGT]?)', value)
                    if size_match:
                        disks.append(size_match.group(1))
            vm["num_hdd"] = len(disks)
            vm["hdd_sizes"] = ", ".join(disks) if disks else "N/A"

            vm["hdd_free"] = "N/A"
            vm["ip_address"] = "N/A"

            if vm.get("status") == "running":
                fsinfo = self.execute_agent_command(node, vmid, "get-fsinfo", csrf_token, ticket)
                if isinstance(fsinfo, list):
                    free_spaces = []
                    for fs in fsinfo:
                        total = fs.get("total-bytes", 0)
                        used = fs.get("used-bytes", 0)
                        free = total - used
                        free_gb = free / (1024 ** 3)
                        free_spaces.append(f"{free_gb:.2f} GB")
                    vm["hdd_free"] = ", ".join(free_spaces) if free_spaces else "No data"
                else:
                    vm["hdd_free"] = "N/A" if fsinfo is None else "Error"

                netinfo = self.execute_agent_command(node, vmid, "network-get-interfaces", csrf_token, ticket)
                if isinstance(netinfo, dict) and 'result' in netinfo:
                    ips = []
                    for iface in netinfo.get("result", []):
                        for ip in iface.get("ip-addresses", []):
                            if ip.get("ip-address-type") == "ipv4":
                                ips.append(ip["ip-address"])
                    vm["ip_address"] = ", ".join(ips) if ips else "No IPv4"
                else:
                    vm["ip_address"] = "N/A" if netinfo is None else "Error"

        return vms

    def vm_action(self, node: str, vmid: int, action: str, csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        if action == 'hibernate':
            action = 'suspend'
        logger.info(f"Performing action {action} for vmid {vmid} on node {node}")
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to %s VM %d: Status %d, Response: %s", action, vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail=f"Failed to {action} VM: {response.text}")
        logger.info(f"VM action response: {response.json()['data']}")
        return response.json()["data"]

    def get_task_status(self, node: str, upid: str, csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        logger.info(f"Fetching task status for UPID {upid} on node {node}")
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/tasks/{upid}/status",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to fetch task status for UPID %s: Status %d, Response: %s", upid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch task status")
        logger.info(f"Task status response: {response.json()['data']}")
        return response.json()["data"]

    def create_vm(self, node: str, vm_create: VMCreateRequest, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        logger.info(f"Creating VM '{vm_create.name}' on node {node}")

        # Get next available VMID
        response = self.session.get(f"{PROXMOX_BASE_URL}/cluster/nextid")
        if response.status_code != 200:
            logger.error("Failed to get next VMID: Status %d, Response: %s", response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to get next VMID")
        vmid = response.json()["data"]

        data = {
            "vmid": vmid,
            "name": vm_create.name,
            "cores": vm_create.cpus,
            "memory": vm_create.ram,
            "net0": "virtio,bridge=vmbr0",
            "agent": 1,
            "ostype": "l26",
            "scsi0": "local-lvm:32",
        }

        if vm_create.source == "ISO":
            data["ide2"] = "local:iso/ubuntu-22.04.3-live-server-amd64.iso,media=cdrom"  # Assume this ISO exists in Proxmox storage
            data["boot"] = "order=ide2;scsi0;net0"
        else:
            data["boot"] = "order=scsi0;net0"

        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu",
            data=data,
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to create VM %s: Status %d, Response: %s", vm_create.name, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail=f"Failed to create VM: {response.text}")
        logger.info(f"VM creation response: {response.json()['data']}")
        return response.json()["data"]