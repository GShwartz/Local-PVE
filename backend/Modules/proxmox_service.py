# Modules/proxmox_service.py (updated to add get_vm_status method)
import requests
import os
from typing import Dict, Any, List
import urllib3  # Added to suppress insecure request warnings
import re
import logging
from fastapi import HTTPException, status  # Added import for HTTPException and status

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)  # Suppress HTTPS verification warnings for local use

# Environment variables (for scalability/upgrades: load from .env or secrets manager)
PROXMOX_HOST = os.getenv("PROXMOX_HOST", "10.0.0.7:8006")
PROXMOX_BASE_URL = f"https://{PROXMOX_HOST}/api2/json"

class ProxmoxService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verify for local self-signed certs (enable in prod with certs)

    def login(self, username: str, password: str) -> Dict[str, str]:
        try:
            response = self.session.post(
                f"{PROXMOX_BASE_URL}/access/ticket",
                data={"username": username, "password": password}
            )
            response.raise_for_status()  # Raise if not 200
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
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes",
            # No CSRF header needed for GET
        )
        if response.status_code != 200:
            logger.error("Failed to fetch nodes: Status %d, Response: %s", response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch nodes")
        return response.json()["data"]

    def get_vm_config(self, node: str, vmid: int, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config"
        )
        if response.status_code != 200:
            logger.error("Failed to fetch VM config for vmid %d: Status %d, Response: %s. Check user permissions.", vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM config")
        return response.json()["data"]

    def get_vm_status(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/current",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to fetch VM status for vmid %d: Status %d, Response: %s", vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VM status")
        return response.json()["data"]["status"]

    def execute_agent_command(self, node: str, vmid: int, command: str, csrf_token: str, ticket: str) -> Any:
        self.set_auth_cookie(ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": command},
            headers={"CSRFPreventionToken": csrf_token}  # Required for POST
        )
        if response.status_code == 200:
            return response.json().get("data")
        logger.warning("Agent command %s failed for vmid %d: Status %d, Response: %s", command, vmid, response.status_code, response.text)
        return None  # Agent not available or error

    def get_vms(self, node: str, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu",
            # No CSRF header needed for GET
        )
        if response.status_code != 200:
            logger.error("Failed to fetch VMs for node %s: Status %d, Response: %s. Check user permissions or node status.", node, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch VMs")
        raw_response = response.json()
        logger.info("Raw Proxmox QEMU response for node %s: %s", node, raw_response)
        vms = raw_response.get("data", [])
        logger.info("Fetched %d VMs for node %s: %s", len(vms), node, [vm.get("vmid") for vm in vms])

        for vm in vms:
            vmid = vm["vmid"]
            config = self.get_vm_config(node, vmid, ticket)
            vm["cpus"] = int(config.get("cores", 0))  # Ensure integer
            vm["ram"] = int(config.get("memory", 0))  # Ensure integer in MB
            vm["name"] = config.get("name", f"VM {vmid}")  # Fallback name
            vm["status"] = vm.get("status", "stopped")  # Default status

            # Add OS type mapping
            ostype = config.get("ostype", "unknown").lower()
            vm["os"] = 'Windows' if 'win' in ostype else 'Linux'

            # Parse disks from config
            disks = []
            disk_prefixes = ["ide", "sata", "scsi", "virtio"]
            for key, value in config.items():
                if any(key.startswith(prefix) for prefix in disk_prefixes) and "cdrom" not in value:
                    size_match = re.search(r'size=(\d+[KMGT]?)', value)
                    if size_match:
                        disks.append(size_match.group(1))
            vm["num_hdd"] = len(disks)
            vm["hdd_sizes"] = ", ".join(disks) if disks else "N/A"

            # Default agent fields
            vm["hdd_free"] = "N/A"
            vm["ip_address"] = "N/A"

            if vm.get("status") == "running":
                # Fetch fsinfo
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

                # Fetch network interfaces
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
        # Map 'hibernate' to Proxmox 'suspend'
        if action == 'hibernate':
            action = 'suspend'
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/status/{action}",
            headers={"CSRFPreventionToken": csrf_token}  # Required for POST
        )
        if response.status_code != 200:
            logger.error("Failed to %s VM %d: Status %d, Response: %s", action, vmid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail=f"Failed to {action} VM")
        return response.json()["data"]  # Returns UPID (task ID)

    def get_task_status(self, node: str, upid: str, csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/tasks/{upid}/status",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            logger.error("Failed to fetch task status for UPID %s: Status %d, Response: %s", upid, response.status_code, response.text)
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch task status")
        return response.json()["data"]