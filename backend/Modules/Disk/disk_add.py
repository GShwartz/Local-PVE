import httpx
import urllib3
from fastapi import HTTPException
from Modules.logger import init_logger
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

# Function to add a disk to a VM
def add_disk(node: str, vmid: int, req, csrf_token: str, ticket: str, log_file: str) -> str:
    logger = init_logger(log_file, __name__)

    headers = {"CSRFPreventionToken": csrf_token}
    cookies = {"PVEAuthCookie": ticket}

    config_resp = httpx.get(
        f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
        headers=headers,
        cookies=cookies,
        verify=False,
    )
    if config_resp.status_code != 200:
        logger.error(f"Failed to get VM config for VM {vmid} on node {node}: {config_resp.text}")
        raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

    config = config_resp.json().get("data", {})
    logger.info(f"Current VM config: {config}")

    slot = 1
    while f"scsi{slot}" in config:
        slot += 1

    disk_id = f"scsi{slot}"
    logger.info(f"Adding disk {disk_id} to VM {vmid} on node {node}")

    value = f"{req.storage}:{req.size},format=qcow2,media=disk,size={req.size}G,ssd=1"
    payload = {disk_id: value}
    logger.info(f"Payload for adding disk: {payload}")

    response = httpx.post(
        f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
        data=payload,
        headers=headers,
        cookies=cookies,
        verify=False,
    )
    logger.info(f"Response from adding disk: {response.text}")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json().get("data", "Disk added")
