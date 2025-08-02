import requests
from fastapi import HTTPException
from typing import List, Dict, Any
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class SnapshotService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_snapshots(self, node: str, vmid: int, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch snapshots")
        snapshots = response.json()["data"]
        return [
            {"name": snap["name"], "description": snap.get("description", ""), "snaptime": snap.get("snaptime")}
            for snap in snapshots if snap["name"] != "current"
        ]
