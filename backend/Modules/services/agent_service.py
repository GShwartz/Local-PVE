import requests
from fastapi import HTTPException
from typing import Dict
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class AgentService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def get_fsinfo(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.session.cookies.set("PVEAuthCookie", ticket)
        resp = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": "get-fsinfo"},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if resp.status_code == 200:
            fsinfo = resp.json().get("data", [])
            return ", ".join(f"{(f['total-bytes']-f['used-bytes'])/(1024**3):.2f} GB" for f in fsinfo)
        return "N/A"

    def get_ip_addresses(self, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        self.session.cookies.set("PVEAuthCookie", ticket)
        resp = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent",
            json={"command": "network-get-interfaces"},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if resp.status_code == 200:
            net = resp.json().get("data", {}).get("result", [])
            ips = [ip["ip-address"] for iface in net for ip in iface.get("ip-addresses", [])
                   if ip.get("ip-address-type") == "ipv4"]
            return ", ".join(ips) if ips else "No IPv4"
        return "N/A"

    def get_vnc_proxy(self, node: str, vmid: int, csrf_token: str, ticket: str) -> Dict[str, str]:
        self.session.cookies.set("PVEAuthCookie", ticket)
        resp = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy",
            data={"websocket": 1},
            headers={"CSRFPreventionToken": csrf_token}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Failed to get VNC proxy")
        return resp.json().get("data", {})
