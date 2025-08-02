from Modules.logger import init_logger
from fastapi import HTTPException
from typing import Dict, Any
import requests
import urllib3


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class TaskService:
    def __init__(self, log_file: str):
        self.session = requests.Session()
        self.session.verify = False

        self.log_file = log_file
        self.logger = init_logger(self.log_file, __name__)

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_task_status(self, node: str, upid: str, csrf_token: str, ticket: str) -> Dict[str, Any]:
        self.logger.info(f"Fetching task status for UPID: {upid} on node: {node}")
        self.set_auth_cookie(ticket)
        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/tasks/{upid}/status",
            headers={"CSRFPreventionToken": csrf_token}
        )
        self.logger.debug(f"Response status code: {response.status_code}, Response content: {response.text}")

        if response.status_code != 200:
            self.logger.error(f"Failed to fetch task status: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch task status")
        
        return response.json()["data"]
