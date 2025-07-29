from pydantic import BaseModel

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
    source: str

class VMUpdateRequest(BaseModel):
    name: str | None = None
    cpus: int | None = None
    ram: int | None = None