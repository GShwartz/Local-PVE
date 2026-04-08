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
        from urllib.parse import unquote
        csrf_token = unquote(csrf_token)
        ticket     = unquote(ticket)

        session = requests.Session()
        session.verify = False

        # Set cookie explicitly in the header — session.cookies.set() without a
        # domain may be silently dropped by requests, causing Proxmox 401 "no ticket".
        headers = {
            "CSRFPreventionToken": csrf_token,
            "Cookie": f"PVEAuthCookie={ticket}",
        }
        url      = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/vncproxy"
        # websocket=0 requests a plain VNC ticket (not a WebSocket upgrade)
        response = session.post(url, headers=headers, data={"websocket": 0, "generate-password": 0})

        self.logger.info(f"VNC proxy status: {response.status_code}")
        self.logger.debug(f"VNC proxy response: {response.text[:400]}")

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"VNC proxy failed ({response.status_code}): {response.text}"
            )

        data = response.json().get("data", {})
        if not data.get("ticket"):
            self.logger.error(f"Proxmox returned no VNC ticket. Full response: {response.text}")
            raise HTTPException(status_code=502, detail="Proxmox returned no VNC ticket — check node connectivity and auth.")

        return data
