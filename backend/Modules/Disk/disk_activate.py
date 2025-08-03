import httpx
import urllib3
from fastapi import HTTPException
import re
import os
from Modules.logger import init_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

async def activate_unused_disk(node: str, vmid: int, unused_key: str, target_controller: str, csrf_token: str, ticket: str, log_file: str) -> dict:
    logger = init_logger(log_file, __name__)
    logger.info(f"Activating unused disk {unused_key} for VM {vmid} on node {node}")

    headers = {"CSRFPreventionToken": csrf_token, "Content-Type": "application/x-www-form-urlencoded"}
    cookies = {"PVEAuthCookie": ticket}

    async with httpx.AsyncClient(verify=False) as client:
        config_resp = await client.get(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            headers=headers,
            cookies=cookies,
        )
        logger.info(f"Response from getting VM config: {config_resp.text}")

        if config_resp.status_code != 200:
            logger.error(f"Failed to get VM config for VM {vmid} on node {node}: {config_resp.text}")
            raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

        config = config_resp.json().get("data", {})
        logger.info(f"Current VM config: {config}")

        if unused_key not in config:
            available = [k for k in config if k.startswith("unused")]
            logger.error(f"Unused disk '{unused_key}' not found. Available: {available}")
            raise HTTPException(status_code=404, detail=f"Unused disk '{unused_key}' not found. Available: {available}")

        volume_path = config[unused_key].strip()
        logger.info(f"Volume path for {unused_key}: {volume_path}")

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
        logger.info(f"Payload for activating disk: {payload}")

        resp = await client.post(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            headers=headers,
            cookies=cookies,
            data=payload,
        )
        logger.info(f"Response from activating disk: {resp.text}")

        if resp.status_code != 200:
            logger.error(f"Failed to activate disk {unused_key} for VM {vmid}: {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        return {
            "success": True,
            "message": f"Moved {unused_key} to {target_key}",
            "target_key": target_key,
            "data": resp.json(),
        }
