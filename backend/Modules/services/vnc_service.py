# vnc_service.py

from Modules.logger import init_logger
from fastapi import HTTPException
import requests
import urllib3
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = f"https://{os.getenv('PROXMOX_HOST', 'pve.home.lab')}:8006/api2/json"


class VNCService:
    def __init__(self, log_file: str):
        self.session = requests.Session()
        self.session.verify = False

        self.log_file = log_file
        self.logger = init_logger(self.log_file, __name__)

    def get_vnc_proxy(self, node: str, vmid: int, csrf_token: str, ticket: str) -> dict:
        # Try with CSRF token - maybe required for VNC proxy
        from urllib.parse import unquote
        csrf_token = unquote(csrf_token)
        ticket = unquote(ticket)

        session = requests.Session()
        session.verify = False
        session.cookies.set("PVEAuthCookie", ticket)

        headers = {"CSRFPreventionToken": csrf_token}
        url = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy"
        response = session.post(url, headers=headers)

        print(f"DEBUG VNC: With CSRF - Status: {response.status_code}")
        print(f"DEBUG VNC: Response: '{response.text}'")

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"VNC proxy failed: {response.text}")

        return response.json().get("data", {})
