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

class NameFieldsMixin(BaseModel):
    """Shared first/last name fields for requests that collect a display name.

    The User model stores one `full_name` column, so callers compose the two
    parts server-side (see `user_service.compose_full_name`) rather than
    persisting them separately. Both values are trimmed before validation, so
    a blank or whitespace-only `first_name` is rejected with 422. `last_name`
    may be empty: mononyms are real, and the client derives it by splitting
    `full_name`, which yields "" for a single-word name -- requiring it would
    lock those users out.
    """

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default="", max_length=100)

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def _strip_whitespace(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class SignupRequest(NameFieldsMixin):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)
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


class UpdateProfileRequest(NameFieldsMixin):
    """Body of PATCH /auth/me.

    Field definitions and validation live on `NameFieldsMixin`, shared with
    `SignupRequest` since both collect the same first/last name pair.
    """
