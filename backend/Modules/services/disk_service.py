import httpx
from fastapi import HTTPException
from typing import Dict
import urllib3
import re
import os
from Modules.logger import init_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

log_file = os.path.join(os.path.dirname(__file__), 'disk_service.log')
logger = init_logger(log_file, __name__)

PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

class DiskService:
    def __init__(self):
        pass

    def add_disk(self, node: str, vmid: int, req, csrf_token: str, ticket: str) -> str:
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

        slot = 1
        while f"scsi{slot}" in config:
            slot += 1

        disk_id = f"scsi{slot}"
        logger.info(f"Adding disk {disk_id} to VM {vmid} on node {node}")

        value = f"{req.storage}:{req.size},format=qcow2,media=disk,size={req.size}G,ssd=1"
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

    async def activate_unused_disk(self, node: str, vmid: int, unused_key: str, target_controller: str, csrf_token: str, ticket: str) -> dict:
        headers = {"CSRFPreventionToken": csrf_token, "Content-Type": "application/x-www-form-urlencoded"}
        cookies = {"PVEAuthCookie": ticket}

        async with httpx.AsyncClient(verify=False) as client:
            config_resp = await client.get(
                f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
                headers=headers,
                cookies=cookies,
            )
            if config_resp.status_code != 200:
                raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

            config = config_resp.json().get("data", {})
            if unused_key not in config:
                available = [k for k in config if k.startswith("unused")]
                raise HTTPException(status_code=404, detail=f"Unused disk '{unused_key}' not found. Available: {available}")

            volume_path = config[unused_key].strip()
            used_slots = [
                int(m.group()) for k in config
                if k.startswith(target_controller) and (m := re.search(r'\d+$', k))
            ]
            slot = 0
            while slot in used_slots:
                slot += 1
            target_key = f"{target_controller}{slot}"
            disk_value = f"file={volume_path},media=disk,format=qcow2,ssd=1"

            payload = {target_key: disk_value}
            resp = await client.post(
                f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
                headers=headers,
                cookies=cookies,
                data=payload,
            )

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)

            return {
                "success": True,
                "message": f"Moved {unused_key} to {target_key}",
                "target_key": target_key,
                "data": resp.json(),
            }

    def delete_disk(self, node: str, vmid: int, disk_key: str, csrf_token: str, ticket: str) -> dict:
        headers = {"CSRFPreventionToken": csrf_token}
        cookies = {"PVEAuthCookie": ticket}

        logger.info(f"Attempting to delete disk '{disk_key}' from VM {vmid} on node {node}")

        config_resp = httpx.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            headers=headers,
            cookies=cookies,
            verify=False,
        )
        if config_resp.status_code != 200:
            raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

        config = config_resp.json().get("data", {})
        disk_value = config.get(disk_key)
        if not disk_value:
            raise HTTPException(status_code=404, detail=f"Disk {disk_key} not found")

        storage_match = disk_value.split(":")[0]
        volid = disk_value.split(":")[1].split(",")[0]
        full_volid = f"{storage_match}:{volid}"

        # First detach the disk
        detach_resp = httpx.put(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data={"delete": disk_key},
            headers=headers,
            cookies=cookies,
            verify=False,
        )
        if detach_resp.status_code != 200:
            raise HTTPException(status_code=detach_resp.status_code, detail=f"Failed to detach disk: {detach_resp.text}")

        # Then delete the underlying volume
        delete_resp = httpx.delete(
            f"{PROXMOX_BASE_URL}/nodes/{node}/storage/{storage_match}/content/{full_volid}",
            headers=headers,
            cookies=cookies,
            verify=False,
        )
        if delete_resp.status_code != 200:
            raise HTTPException(status_code=delete_resp.status_code, detail=f"Failed to delete volume: {delete_resp.text}")

        logger.info(f"Disk {disk_key} detached and volume {full_volid} deleted.")

        return {
            "success": True,
            "message": f"Disk {disk_key} removed and volume {full_volid} deleted",
        }
