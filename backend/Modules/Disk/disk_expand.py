import requests
from fastapi import HTTPException
import os, re, time
from Modules.logger import init_logger

def expand_disk(node, vmid, disk_key, target_size_gb, csrf_token, ticket, log_file):
    logger = init_logger(log_file, __name__)
    logger.info(f"Expanding disk {disk_key} to {target_size_gb}GB for VM {vmid} on {node}")

    if target_size_gb > 80:
        raise HTTPException(status_code=400, detail="Maximum disk size is 80 GB")

    base_url = os.getenv("PROXMOX_API", "https://pve.home.lab:8006/api2/json")
    verify_ssl = os.getenv("VERIFY_SSL", "false").lower().startswith("t")
    headers = {
        "CSRFPreventionToken": csrf_token,
        "Cookie": f"PVEAuthCookie={ticket}"
    }

    # Get current size from Proxmox directly
    def get_current_size():
        config_url = f"{base_url}/nodes/{node}/qemu/{vmid}/config"
        r_cfg = requests.get(config_url, headers=headers, verify=verify_ssl)
        if r_cfg.status_code != 200:
            raise HTTPException(status_code=r_cfg.status_code, detail=r_cfg.text)
        data = r_cfg.json().get("data", {})
        match = re.search(r"size=(\d+)", data.get(disk_key, ""))
        if not match:
            raise HTTPException(status_code=404, detail=f"Could not determine current size for {disk_key}")
        return int(match.group(1))

    current_size_gb = get_current_size()
    if target_size_gb <= current_size_gb:
        raise HTTPException(status_code=400, detail="New size must be greater than current size")

    logger.info(f"Current size: {current_size_gb}GB, Target size: {target_size_gb}GB")
    resize_url = f"{base_url}/nodes/{node}/qemu/{vmid}/resize"

    # Loop in +1G increments until target is reached
    while current_size_gb < target_size_gb:
        params = {
            "disk": disk_key,
            "size": "+1G"
        }
        logger.info(f"Resizing {disk_key} by +1G (from {current_size_gb}GB)")
        r = requests.put(resize_url, params=params, headers=headers, verify=verify_ssl)
        if r.status_code != 200:
            logger.error(f"Resize failed: {r.text}")
            raise HTTPException(status_code=r.status_code, detail=r.text)

        time.sleep(1)  # Let Proxmox update before checking size
        new_size = get_current_size()

        if new_size == current_size_gb:
            raise HTTPException(
                status_code=500,
                detail="Resize did not change disk size; storage backend may be preventing growth"
            )

        current_size_gb = new_size
        logger.info(f"New reported size: {current_size_gb}GB")

    logger.info(f"Disk {disk_key} successfully expanded to {current_size_gb}GB")
    return {"success": True, "message": f"Disk {disk_key} resized to {current_size_gb} GB"}
