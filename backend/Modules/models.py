from pydantic import BaseModel
from typing import Optional, List

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    ticket: str
    csrf_token: str

class ExtraDisk(BaseModel):
    size: int = 20          # GB
    storage: str = "local-lvm"
    controller: str = "scsi"   # scsi | virtio | sata | ide

class ExtraNic(BaseModel):
    bridge: str = "vmbr0"
    model: str = "virtio"

class VMCreateRequest(BaseModel):
    name: str
    cpus: int
    ram: int
    source: str          # OS label (qcow2) or ISO filename (e.g. "custom.iso")
    uefi: bool = False
    create_mode: str = "qcow2"   # "qcow2" | "iso"
    disk_size: int = 32          # GB for the main disk
    disk_controller: str = "scsi"  # scsi | virtio | sata | ide (main disk)
    extra_disks: List[ExtraDisk] = []
    extra_nics:  List[ExtraNic]  = []

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
