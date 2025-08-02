import requests
from fastapi import HTTPException, status
import logging
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from Modules.logger import init_logger


PROXMOX_BASE_URL = "https://pve.home.lab:8006/api2/json"


class AuthService:
    def __init__(self, log_file: str):
        self.session = requests.Session()
        self.session.verify = False

        self.log_file = log_file
        self.logger = init_logger(self.log_file, __name__)

    def login(self, username: str, password: str) -> dict:
        try:
            self.logger.info(f"Attempting login with username: {username}")
            response = self.session.post(
                f"{PROXMOX_BASE_URL}/access/ticket",
                data={"username": username, "password": password}
            )
            self.logger.info(f"Login response status code: {response.status_code}")

            response.raise_for_status()
            self.logger.info("Login successful")

            data = response.json()["data"]
            self.session.cookies.set("PVEAuthCookie", data["ticket"])
            self.logger.info("Login successful for user: %s", username)
            return {"ticket": data["ticket"], "csrf_token": data["CSRFPreventionToken"]}
        
        except requests.exceptions.HTTPError:
            self.logger.error("Login failed: %s", response.text)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {response.text}"
            )
        
        except Exception as e:
            self.logger.error("Unexpected login error: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
