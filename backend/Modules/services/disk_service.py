import httpx
from fastapi import HTTPException
from typing import Dict
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class DiskService:
    def __init__(self):
        pass

    def add_disk(self, node: str, vmid: int, req, csrf_token: str, ticket: str) -> str:
        disk_id = f"{req.controller}{req.bus}"

        headers = {"CSRFPreventionToken": csrf_token}
        cookies = {"PVEAuthCookie": ticket}

        config_resp = httpx.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            headers=headers,
            cookies=cookies,
            verify=False,
        )

        if config_resp.status_code != 200:
            raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

        config = config_resp.json().get("data", {})
        if disk_id in config:
            raise HTTPException(status_code=409, detail=f"Slot {disk_id} already in use")

        base_value = f"{req.storage}:{req.size}"
        if req.format == "qcow2" and any(req.storage.startswith(p) for p in ["local", "vmstorage"]):
            base_value += ",format=qcow2"
        value = f"{base_value},media=disk,size={req.size}G"

        payload = {disk_id: value}

        response = httpx.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data=payload,
            headers=headers,
            cookies=cookies,
            verify=False,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)

        return response.json().get("data", "Disk added")
