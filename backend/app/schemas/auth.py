from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# Keep in sync with the client-side rule in
# frontend/apps/web/src/utils/validation-schemas.ts.
PASSWORD_MIN_LENGTH = 8


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
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)
    full_name: str
    # Self-service signup may only create students. Any other role has to be
    # granted server-side, never chosen by the client.
    role: Literal["student"] = "student"

class LoginRequest(BaseModel):
    email: EmailStr
    role: str = "student"
    password: str

class AuthResponse(BaseModel):
    user: AuthUserResponse


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationByEmailRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)

