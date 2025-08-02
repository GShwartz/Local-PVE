import requests
from fastapi import HTTPException, status
import logging
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"
logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False

    def login(self, username: str, password: str) -> dict:
        try:
            logger.info(f"Attempting login with username: {username}")
            response = self.session.post(
                f"{PROXMOX_BASE_URL}/access/ticket",
                data={"username": username, "password": password}
            )
            response.raise_for_status()
            data = response.json()["data"]
            self.session.cookies.set("PVEAuthCookie", data["ticket"])
            logger.info("Login successful for user: %s", username)
            return {"ticket": data["ticket"], "csrf_token": data["CSRFPreventionToken"]}
        except requests.exceptions.HTTPError:
            logger.error("Login failed: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {response.text}"
            )
        except Exception as e:
            logger.error("Unexpected login error: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
