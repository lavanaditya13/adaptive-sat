from pydantic import BaseModel, EmailStr


class AuthUserResponse(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str | None = None
    role: str
    email_verified: bool
    oauth_provider: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: AuthUserResponse

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "student"  # student, parent, tutor

class LoginRequest(BaseModel):
    email: EmailStr
    role: str = "student"
    password: str

class AuthResponse(BaseModel):
    user: AuthUserResponse


class VerifyEmailRequest(BaseModel):
    token: str

class RefreshRequest(BaseModel):
    refresh_token: str

class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int
