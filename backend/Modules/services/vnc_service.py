# vnc_service.py

import requests
from fastapi import HTTPException
import urllib3
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

PROXMOX_BASE_URL = f"https://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}:8006/api2/json"


class VNCService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def get_vnc_proxy(self, node: str, vmid: int, csrf_token: str, ticket: str) -> dict:
        self.session.cookies.set("PVEAuthCookie", ticket)
        headers = {"CSRFPreventionToken": csrf_token}
        url = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy"

        response = self.session.post(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get VNC proxy")

        return response.json().get("data", {})
