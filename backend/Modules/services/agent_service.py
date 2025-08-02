import requests
from fastapi import HTTPException
from typing import Dict, Any
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

class AgentService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def execute_agent_command(self, node: str, vmid: int, command: str, csrf_token: str, ticket: str) -> Any:
        self.session.cookies.set("PVEAuthCookie", ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": command},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code == 200:
            return response.json().get("data")
        return None

    def get_fsinfo(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        result = self.execute_agent_command(node, vmid, "get-fsinfo", csrf_token, ticket)
        if isinstance(result, list):
            return ", ".join(f"{(f['total-bytes']-f['used-bytes'])/(1024**3):.2f} GB" for f in result)
        return "N/A"

    def get_ip_addresses(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        result = self.execute_agent_command(node, vmid, "network-get-interfaces", csrf_token, ticket)
        if isinstance(result, dict) and "result" in result:
            net = result["result"]
            ips = [ip["ip-address"] for iface in net for ip in iface.get("ip-addresses", [])
                   if ip.get("ip-address-type") == "ipv4"]
            return ", ".join(ips) if ips else "No IPv4"
        return "N/A"
