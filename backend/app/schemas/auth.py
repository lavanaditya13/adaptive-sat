from pydantic import BaseModel, EmailStr
from app.schemas.user import UserResponse

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"  # student, parent, tutor

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    expires_in: int

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int
