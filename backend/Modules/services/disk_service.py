from Modules.Disk.disk_add import add_disk
from Modules.Disk.disk_delete import delete_disk
from Modules.Disk.disk_activate import activate_unused_disk
from Modules.logger import init_logger


class DiskService:
    def __init__(self, log_file):
        self.log_file = log_file
        self.logger = init_logger(log_file, __name__)

    def add_disk(self, node, vmid, req, csrf_token, ticket):
        self.logger.info(f"Adding disk to VM {vmid} on node {node}")
        return add_disk(node, vmid, req, csrf_token, ticket, self.log_file)
        
    def delete_disk(self, node, vmid, disk_key, csrf_token, ticket):
        self.logger.info(f"Deleting disk {disk_key} from VM {vmid} on node {node}")
        return delete_disk(node, vmid, disk_key, csrf_token, ticket, self.log_file)

    async def activate_unused_disk(self, node, vmid, unused_key, target_controller, csrf_token, ticket):
        self.logger.info(f"Activating unused disk {unused_key} for VM {vmid} on node {node}")
        return await activate_unused_disk(node, vmid, unused_key, target_controller, csrf_token, ticket, self.log_file)
