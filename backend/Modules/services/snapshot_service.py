from Modules.logger import init_logger
from typing import List, Dict, Any
from fastapi import HTTPException
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class SnapshotService:
    def __init__(self, log_file: str):
        self.session = requests.Session()
        self.session.verify = False

        self.log_file = log_file
        self.logger = init_logger(log_file, __name__)

    def set_auth_cookie(self, ticket: str):
        self.session.cookies.set("PVEAuthCookie", ticket)

    def get_snapshots(self, node: str, vmid: int, csrf_token: str, ticket: str) -> List[Dict[str, Any]]:
        self.logger.info(f"Fetching snapshots for VM {vmid} on node {node}")
        self.set_auth_cookie(ticket)

        response = self.session.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot",
            headers={"CSRFPreventionToken": csrf_token}
        )
        self.logger.debug(f"Response status code: {response.status_code}")

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch snapshots")
        snapshots = response.json()["data"]
        self.logger.debug(f"Snapshots fetched: {snapshots}")

        return [
            {"name": snap["name"], "description": snap.get("description", ""), "snaptime": snap.get("snaptime")}
            for snap in snapshots if snap["name"] != "current"
        ]

    def create_snapshot(self, node: str, vmid: int, snapname: str, description: str, vmstate: int, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Creating snapshot '{snapname}' for VM {vmid} on node {node}")
        self.set_auth_cookie(ticket)
        endpoint = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot"
        self.logger.debug(f"Endpoint for snapshot creation: {endpoint}")

        try:
            response = self.session.post(
                endpoint,
                data={"snapname": snapname, "description": description, "vmstate": str(vmstate)},
                headers={"CSRFPreventionToken": csrf_token}
            )
            self.logger.debug(f"Response status code: {response.status_code}")
            response.raise_for_status()

            return response.json()["data"]
        
        except requests.exceptions.HTTPError as http_err:
            self.logger.error(f"HTTP error occurred: {http_err}")
            err = response.text

            try:
                self.logger.debug(f"Response JSON: {response.json()}")
                j = response.json()
                err = j.get("errors", {}).get("snapname", j.get("data", err))

            except ValueError:
                self.logger.debug("Response is not JSON, using raw text")
                pass
            
            self.logger.error(f"Failed to create snapshot '{snapname}': {err}")
            raise HTTPException(status_code=400, detail=f"Failed to create snapshot '{snapname}': {err}")
        
        except Exception as e:
            self.logger.error(f"An error occurred while creating snapshot '{snapname}': {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    def revert_snapshot(self, node: str, vmid: int, snapname: str, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Reverting to snapshot '{snapname}' for VM {vmid} on node {node}")
        self.set_auth_cookie(ticket)
        response = self.session.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}/rollback",
            headers={"CSRFPreventionToken": csrf_token}
        )
        self.logger.debug(f"Response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to revert snapshot '{snapname}': {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Failed to revert snapshot {snapname}")
        
        return response.json()["data"]

    def delete_snapshot(self, node: str, vmid: int, snapname: str, csrf_token: str, ticket: str) -> str:
        self.logger.info(f"Deleting snapshot '{snapname}' for VM {vmid} on node {node}")
        self.set_auth_cookie(ticket)
        response = self.session.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/snapshot/{snapname}",
            headers={"CSRFPreventionToken": csrf_token}
        )
        self.logger.debug(f"Response status code: {response.status_code}")

        if response.status_code != 200:
            self.logger.error(f"Failed to delete snapshot '{snapname}': {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Failed to delete snapshot {snapname}")
        
        return response.json()["data"]
