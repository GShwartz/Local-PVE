from pydantic import BaseModel
from typing import Literal, Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    ticket: str
    csrf_token: str

class VMCreateRequest(BaseModel):
    name: str
    cpus: int
    ram: int
    source: Literal["ISO", "template", "disk"]  # restrict to known sources if you like

class VMUpdateRequest(BaseModel):
    name: Optional[str] = None
    cpus: Optional[int] = None
    ram: Optional[int] = None

class VMCloneRequest(BaseModel):
    """
    Request body for cloning a VM.
    - name: name of the new VM
    - full: whether to perform a full clone (True) or a linked clone (False)
    - target: node to create the clone on
    - storage: (optional) custom storage ID for the clone
    """
    name: str
    full: bool = False
    target: str
    storage: Optional[str] = None

class VMDiskAddRequest(BaseModel):
    controller: str
    bus: int
    size: int
    storage: str
    format: Optional[str] = "qcow2"
