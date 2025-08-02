import requests
from fastapi import HTTPException
from typing import Dict, Any
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class TaskService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_task_status(self, node: str, upid: str, csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/tasks/{upid}/status",
            headers={"CSRFPreventionToken": csrf_token}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch task status")
        return response.json()["data"]
