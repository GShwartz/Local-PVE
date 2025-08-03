from Modules.logger import init_logger
from typing import Any
import httpx

PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class AgentService:
    def __init__(self, log_file: str):
        self.log_file = log_file
        self.logger = init_logger(log_file, __name__)

    async def execute_agent_command(
        self, client: httpx.AsyncClient, node: str, vmid: int, command: str, csrf_token: str, ticket: str
    ) -> Any:
        self.logger.info(f"Executing agent command '{command}' on VMID {vmid}")
        url = f"{PROXMOX_BASE_URL}/nodes/{node}/qemu/{vmid}/agent"
        headers = {"CSRFPreventionToken": csrf_token}
        cookies = {"PVEAuthCookie": ticket}

        try:
            response = await client.post(
                url,
                data={"command": command},
                headers=headers,
                cookies=cookies,
            )

            response.raise_for_status()
            return response.json().get("data")
        except httpx.HTTPError as e:
            self.logger.error(f"Agent command '{command}' failed: {e}")
            return None

    async def get_ip_addresses(self, client: httpx.AsyncClient, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        result = await self.execute_agent_command(client, node, vmid, "network-get-interfaces", csrf_token, ticket)
        if isinstance(result, dict) and "result" in result:
            net = result["result"]
            ips = [
                ip["ip-address"]
                for iface in net
                for ip in iface.get("ip-addresses", [])
                if ip.get("ip-address-type") == "ipv4"
            ]
            return ", ".join(ips) if ips else "No IPv4"
        return "N/A"

    async def get_fsinfo(self, client: httpx.AsyncClient, node: str, vmid: int, csrf_token: str, ticket: str) -> str:
        result = await self.execute_agent_command(client, node, vmid, "get-fsinfo", csrf_token, ticket)
        if isinstance(result, list):
            try:
                return ", ".join(
                    f"{(fs['total-bytes'] - fs['used-bytes']) / (1024**3):.2f} GB"
                    for fs in result if "total-bytes" in fs and "used-bytes" in fs
                )
            except Exception as e:
                self.logger.warning(f"FS info parse failed: {e}")
                return "N/A"
        return "N/A"
