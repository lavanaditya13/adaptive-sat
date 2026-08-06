from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlencode

import requests
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.repositories.user import user_repository

OAUTH_STATE_PURPOSE = "oauth_state"
OAUTH_STATE_EXPIRE_MINUTES = 10

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = "openid email profile"


class OAuthError(RuntimeError):
    """Raised when an OAuth flow cannot complete."""


class OAuthStateExpiredError(OAuthError):
    """Raised when OAuth state has expired."""


class OAuthStateInvalidError(OAuthError):
    """Raised when OAuth state is invalid."""


class OAuthProviderError(OAuthError):
    """Raised when the identity provider returns an error or bad response."""


class OAuthConfigurationError(OAuthError):
    """Raised when OAuth settings are missing."""


class OAuthProviderConflictError(OAuthError):
    """Raised when a provider identity cannot be linked to the current user."""


def _create_oauth_state(*, provider: str, intent: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OAUTH_STATE_EXPIRE_MINUTES)
    payload = {
        "purpose": OAUTH_STATE_PURPOSE,
        "provider": provider,
        "intent": intent,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _decode_oauth_state(state: str, *, expected_provider: str) -> str:
    try:
        payload = jwt.decode(
            state,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except ExpiredSignatureError as exc:
        raise OAuthStateExpiredError("OAuth state has expired.") from exc
    except JWTError as exc:
        raise OAuthStateInvalidError("Invalid OAuth state.") from exc

    if payload.get("purpose") != OAUTH_STATE_PURPOSE:
        raise OAuthStateInvalidError("Invalid OAuth state.")

    if payload.get("provider") != expected_provider:
        raise OAuthStateInvalidError("Invalid OAuth state.")

    intent = payload.get("intent") or "login"
    if intent not in {"login", "signup", "link"}:
        raise OAuthStateInvalidError("Invalid OAuth state.")

    return intent


def get_oauth_intent(state: str, *, provider: str) -> str:
    """Public helper for endpoints to inspect OAuth intent before completion."""
    return _decode_oauth_state(state, expected_provider=provider)


def _require_google_configuration() -> None:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise OAuthConfigurationError(
            "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured."
        )


def build_google_authorization_url(intent: str = "login") -> str:
    _require_google_configuration()
    state = _create_oauth_state(provider="google", intent=intent)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def _exchange_google_code_for_profile(code: str) -> dict[str, Any]:
    _require_google_configuration()

    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )

    if token_response.status_code != 200:
        raise OAuthProviderError("Google token exchange failed.")

    access_token = token_response.json().get("access_token")
    if not access_token:
        raise OAuthProviderError("Google token exchange failed.")

    userinfo_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )

    if userinfo_response.status_code != 200:
        raise OAuthProviderError("Google userinfo request failed.")

    profile = userinfo_response.json()
    if not profile.get("email") or not profile.get("sub"):
        raise OAuthProviderError("Google profile response missing required fields.")

    if not profile.get("email_verified"):
        raise OAuthProviderError("Google account email is not verified.")

    return {
        "email": profile["email"],
        "provider_id": profile["sub"],
        "full_name": profile.get("name"),
        "email_verified": True,
    }


async def _upsert_oauth_user(
    db: AsyncSession,
    *,
    provider: str,
    provider_id: str,
    email: str | None,
    full_name: str | None,
    email_verified: bool,
) -> User:
    existing_provider_user = await user_repository.get_by_oauth_identity(
        db,
        provider=provider,
        oauth_id=provider_id,
    )
    if existing_provider_user:
        updates: dict[str, Any] = {"email_verified": email_verified}
        if full_name and not existing_provider_user.full_name:
            updates["full_name"] = full_name
        return await user_repository.update(
            db,
            db_obj=existing_provider_user,
            obj_in=updates,
        )

    if email:
        existing_email_user = await user_repository.get_by_email(db, email=email)
        if existing_email_user:
            updates = {
                "oauth_provider": provider,
                "oauth_id": provider_id,
                "email_verified": email_verified,
            }
            if full_name and not existing_email_user.full_name:
                updates["full_name"] = full_name

            return await user_repository.update(
                db,
                db_obj=existing_email_user,
                obj_in=updates,
            )

    if not email:
        raise OAuthProviderError(
            "OAuth provider did not return an email and no linked account exists."
        )

    return await user_repository.create_user(
        db,
        obj_in=SimpleNamespace(
            email=email,
            password=None,
            full_name=full_name,
            role="student",
            is_active=True,
            email_verified=email_verified,
            oauth_provider=provider,
            oauth_id=provider_id,
        ),
    )


async def _link_oauth_to_current_user(
    db: AsyncSession,
    *,
    current_user: User,
    provider: str,
    provider_id: str,
    full_name: str | None,
    email_verified: bool,
) -> User:
    existing_provider_user = await user_repository.get_by_oauth_identity(
        db,
        provider=provider,
        oauth_id=provider_id,
    )

    if existing_provider_user and existing_provider_user.id != current_user.id:
        raise OAuthProviderConflictError(
            "This OAuth account is already linked to another user."
        )

    if current_user.oauth_provider and current_user.oauth_provider != provider:
        raise OAuthProviderConflictError(
            "A different OAuth provider is already linked to this account."
        )

    updates: dict[str, Any] = {
        "oauth_provider": provider,
        "oauth_id": provider_id,
        "email_verified": email_verified,
    }

    if full_name and not current_user.full_name:
        updates["full_name"] = full_name

    return await user_repository.update(
        db,
        db_obj=current_user,
        obj_in=updates,
    )


async def complete_google_oauth(
    db: AsyncSession,
    code: str,
    state: str,
    *,
    current_user: User | None = None,
) -> User:
    intent = _decode_oauth_state(state, expected_provider="google")
    profile = _exchange_google_code_for_profile(code)

    if intent == "link":
        if current_user is None:
            raise OAuthProviderError("Authenticated user required for account linking.")

        return await _link_oauth_to_current_user(
            db,
            current_user=current_user,
            provider="google",
            provider_id=profile["provider_id"],
            full_name=profile.get("full_name"),
            email_verified=profile.get("email_verified", True),
        )

    return await _upsert_oauth_user(
        db,
        provider="google",
        provider_id=profile["provider_id"],
        email=profile.get("email"),
        full_name=profile.get("full_name"),
        email_verified=profile.get("email_verified", True),
    )
