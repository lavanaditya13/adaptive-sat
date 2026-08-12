from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

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


class UpdateProfileRequest(BaseModel):
    """Body of PATCH /auth/me.

    The User model stores one `full_name` column, so the two parts are composed
    server-side (see user_service.update_user_profile) rather than persisted
    separately. Both values are trimmed before validation, so a blank or
    whitespace-only `first_name` is rejected with 422. `last_name` may be empty:
    mononyms are real, and the client derives it by splitting `full_name`, which
    yields "" for a single-word name -- requiring it would lock those users out
    of editing their own profile.
    """

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def _strip_whitespace(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value
