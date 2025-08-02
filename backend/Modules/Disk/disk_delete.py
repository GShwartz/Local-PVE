import httpx
import urllib3
from fastapi import HTTPException
from Modules.logger import init_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"

def delete_disk(node: str, vmid: int, disk_key: str, csrf_token: str, ticket: str, log_file: str) -> dict:
    logger = init_logger(log_file, __name__)
    logger.info(f"Attempting to delete disk '{disk_key}' from VM {vmid} on node {node}")

    headers = {"CSRFPreventionToken": csrf_token}
    cookies = {"PVEAuthCookie": ticket}

    config_resp = httpx.get(
        f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
        headers=headers,
        cookies=cookies,
        verify=False,
    )
    logger.info(f"Response from getting VM config: {config_resp.text}")
    if config_resp.status_code != 200:
        logger.error(f"Failed to get VM config for VM {vmid} on node {node}: {config_resp.text}")
        raise HTTPException(status_code=config_resp.status_code, detail="Failed to get VM config")

    config = config_resp.json().get("data", {})
    disk_value = config.get(disk_key)
    logger.info(f"Disk value for {disk_key}: {disk_value}")

    if not disk_value:
        logger.error(f"Disk {disk_key} not found in VM {vmid} config")
        raise HTTPException(status_code=404, detail=f"Disk {disk_key} not found")

    try:
        full_volid = disk_value.split(",")[0]
        storage, filename = full_volid.split(":")

    except Exception:
        logger.error(f"Failed to parse volid from disk value: {disk_value}")
        raise HTTPException(status_code=400, detail=f"Failed to parse volid: {disk_value}")

    logger.info(f"Resolved volume to delete: {full_volid}")

    detach_resp = httpx.put(
        f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
        data={"delete": disk_key},
        headers=headers,
        cookies=cookies,
        verify=False,
    )

    if detach_resp.status_code != 200:
        logger.error(f"Failed to detach disk {disk_key} from VM {vmid}: {detach_resp.text}")
        raise HTTPException(status_code=detach_resp.status_code, detail=f"Failed to detach disk: {detach_resp.text}")

    logger.info(f"Detached disk {disk_key} from VM {vmid}")

    delete_resp = httpx.delete(
        f"{PROXMOX_BASE_URL}/nodes/{node}/storage/{storage}/content/{filename}",
        headers=headers,
        cookies=cookies,
        verify=False,
    )
    logger.info(f"Response from deleting volume: {delete_resp.text}")

    if delete_resp.status_code != 200:
        logger.error(f"Failed to delete volume {filename} from storage {storage}: {delete_resp.text}")
        raise HTTPException(status_code=delete_resp.status_code, detail=f"Failed to delete volume: {delete_resp.text}")
    logger.info(f"Deleted volume {filename} from storage {storage}")

    final_config_resp = httpx.get(
        f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
        headers=headers,
        cookies=cookies,
        verify=False,
    )
    logger.info(f"Response from refreshing VM config: {final_config_resp.text}")
    if final_config_resp.status_code != 200:
        logger.error(f"Failed to refresh VM config after deleting disk {disk_key}: {final_config_resp.text}")
        raise HTTPException(status_code=final_config_resp.status_code, detail="Failed to refresh VM config")

    final_config = final_config_resp.json().get("data", {})
    logger.info(f"Final VM config after deletion: {final_config}")

    unused_to_delete = [
        k for k, v in final_config.items()
        if k.startswith("unused") and full_volid in v
    ]
    logger.info(f"Unused disk entries to clean up: {unused_to_delete}")

    for unused_key in unused_to_delete:
        logger.info(f"Cleaning up lingering config entry: {unused_key}")
        cleanup_resp = httpx.put(
            f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/config",
            data={"delete": unused_key},
            headers=headers,
            cookies=cookies,
            verify=False,
        )
        if cleanup_resp.status_code != 200:
            logger.error(f"Failed to remove unused disk {unused_key}: {cleanup_resp.text}")
            raise HTTPException(status_code=cleanup_resp.status_code, detail=f"Failed to remove unused disk '{unused_key}': {cleanup_resp.text}")
        
        logger.info(f"Removed lingering unused disk config: {unused_key}")

    return {
        "success": True,
        "message": f"Disk {disk_key} detached, volume {filename} deleted, and unused entries cleaned",
    }
