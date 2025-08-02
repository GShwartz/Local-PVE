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
        self.logger.info("Fetching VNC Proxy")
        self.session.cookies.set("PVEAuthCookie", ticket)
        headers = {"CSRFPreventionToken": csrf_token}
        url = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy"
        self.logger.info(f"VNC URL: {url}")

        response = self.session.post(url, headers=headers)
        if response.status_code != 200:
            self.logger.error(f"Failed to get VNC proxy")
            raise HTTPException(status_code=response.status_code, detail="Failed to get VNC proxy")

        return response.json().get("data", {})
