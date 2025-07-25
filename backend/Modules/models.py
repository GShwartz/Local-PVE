# Modules/models.py
from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    ticket: str
    csrf_token: str