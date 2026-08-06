from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import EmailConfigurationError, EmailSendError, send_email
from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user import user_repository

EMAIL_VERIFICATION_PURPOSE = "email_verification"
EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS = 24
DEFAULT_VERIFICATION_SUBJECT = "Verify your email address"
PASSWORD_RESET_PURPOSE = "password_reset"
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 2
DEFAULT_PASSWORD_RESET_SUBJECT = "Reset your password"


class VerificationTokenError(Exception):
    """Raised when a verification token cannot be processed."""


class VerificationTokenExpiredError(VerificationTokenError):
    """Raised when a verification token has expired."""


class VerificationTokenInvalidError(VerificationTokenError):
    """Raised when a verification token is invalid."""


class VerificationEmailAlreadySentError(VerificationTokenError):
    """Raised when an email should not be re-sent because the user is already verified."""


class PasswordResetTokenError(Exception):
    """Raised when a password-reset token cannot be processed."""


class PasswordResetTokenExpiredError(PasswordResetTokenError):
    """Raised when a password-reset token has expired."""


class PasswordResetTokenInvalidError(PasswordResetTokenError):
    """Raised when a password-reset token is invalid."""


def _verification_link(token: str) -> str:
    base_url = settings.FRONTEND_URL.rstrip("/")
    return f"{base_url}/verify-email?token={token}"


def _password_reset_link(token: str) -> str:
    base_url = settings.FRONTEND_URL.rstrip("/")
    return f"{base_url}/reset-password?token={token}"


def create_email_verification_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS
    )

    payload = {
        "sub": str(user_id),
        "purpose": EMAIL_VERIFICATION_PURPOSE,
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_email_verification_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except ExpiredSignatureError as exc:
        raise VerificationTokenExpiredError("Verification token has expired.") from exc
    except JWTError as exc:
        raise VerificationTokenInvalidError("Invalid verification token.") from exc

    if payload.get("purpose") != EMAIL_VERIFICATION_PURPOSE:
        raise VerificationTokenInvalidError("Invalid verification token.")

    subject = payload.get("sub")

    try:
        return int(subject)
    except (TypeError, ValueError) as exc:
        raise VerificationTokenInvalidError("Invalid verification token.") from exc


def create_password_reset_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS
    )

    payload = {
        "sub": str(user_id),
        "purpose": PASSWORD_RESET_PURPOSE,
        "exp": expires_at,
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_password_reset_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except ExpiredSignatureError as exc:
        raise PasswordResetTokenExpiredError("Password reset token has expired.") from exc
    except JWTError as exc:
        raise PasswordResetTokenInvalidError("Invalid password reset token.") from exc

    if payload.get("purpose") != PASSWORD_RESET_PURPOSE:
        raise PasswordResetTokenInvalidError("Invalid password reset token.")

    subject = payload.get("sub")

    try:
        return int(subject)
    except (TypeError, ValueError) as exc:
        raise PasswordResetTokenInvalidError("Invalid password reset token.") from exc


async def send_verification_email(user: User) -> None:
    token = create_email_verification_token(user.id)
    verification_link = _verification_link(token)
    display_name = user.full_name or "there"

    html = f"""
    <p>Hi {display_name},</p>
    <p>Verify your email address to finish setting up your Adaptive SAT account.</p>
    <p><a href=\"{verification_link}\">Verify my email</a></p>
    <p>If you did not create this account, you can ignore this message.</p>
    """.strip()

    try:
        send_email(
            to=user.email,
            subject=DEFAULT_VERIFICATION_SUBJECT,
            html=html,
        )
    except (EmailConfigurationError, EmailSendError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


async def send_password_reset_email(user: User) -> None:
    token = create_password_reset_token(user.id)
    reset_link = _password_reset_link(token)
    display_name = user.full_name or "there"

    html = f"""
    <p>Hi {display_name},</p>
    <p>Use this link to reset your Adaptive SAT password.</p>
    <p><a href=\"{reset_link}\">Reset my password</a></p>
    <p>If you did not request this, you can ignore this message.</p>
    """.strip()

    try:
        send_email(
            to=user.email,
            subject=DEFAULT_PASSWORD_RESET_SUBJECT,
            html=html,
        )
    except (EmailConfigurationError, EmailSendError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


async def verify_email(db: AsyncSession, token: str) -> User:
    user_id = decode_email_verification_token(token)
    user = await user_repository.get(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification user not found.",
        )

    if not user.email_verified:
        user = await user_repository.update(
            db,
            db_obj=user,
            obj_in={"email_verified": True},
        )

    return user


async def resend_verification_email(db: AsyncSession, user: User) -> bool:
    if user.email_verified:
        return False

    await send_verification_email(user)
    return True


async def resend_verification_email_by_address(db: AsyncSession, email: str) -> bool:
    """Best-effort resend by email for unauthenticated flows.

    Returns True only when an unverified user exists and send was attempted.
    Returns False for missing/verified users to avoid account enumeration.
    """
    user = await user_repository.get_by_email(db, email=email)
    if user is None or user.email_verified:
        return False

    await send_verification_email(user)
    return True


async def issue_signup_verification_email(user: User) -> None:
    await send_verification_email(user)


async def request_password_reset_email_by_address(db: AsyncSession, email: str) -> bool:
    user = await user_repository.get_by_email(db, email=email)
    if user is None or not user.email_verified or not user.hashed_password:
        return False

    await send_password_reset_email(user)
    return True


async def reset_password(db: AsyncSession, token: str, new_password: str) -> User:
    user_id = decode_password_reset_token(token)
    user = await user_repository.get(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password reset user not found.",
        )

    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset is only available for password-based accounts.",
        )

    return await user_repository.update(
        db,
        db_obj=user,
        obj_in={"hashed_password": get_password_hash(new_password)},
    )
