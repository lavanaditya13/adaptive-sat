"""Regression tests for the auth hardening pass.

Covers the server-side password floor, the signup role allow-list, the
SameSite session cookie, the removal of the unauthenticated /refresh
token-exchange endpoint, and the production SECRET_KEY startup guard.
"""

from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.api.v1.endpoints import auth as auth_module
from app.core.config import (
    PLACEHOLDER_SECRET_KEYS,
    SECRET_KEY_MIN_LENGTH,
    Settings,
)
from app.schemas.auth import (
    PASSWORD_MIN_LENGTH,
    ResetPasswordRequest,
    SignupRequest,
)


@pytest.fixture
def session_user():
    return SimpleNamespace(
        id=7,
        email="student@example.com",
        full_name="Student One",
        role="student",
        email_verified=True,
        oauth_provider=None,
    )


# --- Password minimum length (must match the frontend zod rule) -------------


def test_password_min_length_matches_frontend_rule():
    assert PASSWORD_MIN_LENGTH == 8


@pytest.mark.parametrize("short_password", ["", "a", "short", "1234567"])
def test_signup_request_rejects_short_password(short_password):
    with pytest.raises(ValidationError) as exc_info:
        SignupRequest(
            email="student@example.com",
            password=short_password,
            full_name="Student One",
        )

    assert "at least 8 characters" in str(exc_info.value)


def test_signup_request_accepts_password_at_minimum_length():
    request = SignupRequest(
        email="student@example.com",
        password="a" * PASSWORD_MIN_LENGTH,
        full_name="Student One",
    )

    assert request.password == "a" * PASSWORD_MIN_LENGTH


@pytest.mark.parametrize("short_password", ["", "a", "1234567"])
def test_reset_password_request_rejects_short_password(short_password):
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="reset-token", password=short_password)


def test_reset_password_request_accepts_password_at_minimum_length():
    request = ResetPasswordRequest(
        token="reset-token",
        password="a" * PASSWORD_MIN_LENGTH,
    )

    assert request.password == "a" * PASSWORD_MIN_LENGTH


# --- Signup role allow-list -------------------------------------------------


def test_signup_request_defaults_to_student_role():
    request = SignupRequest(
        email="student@example.com",
        password="a-good-password",
        full_name="Student One",
    )

    assert request.role == "student"


@pytest.mark.parametrize("role", ["admin", "tutor", "parent", "superuser"])
def test_signup_request_rejects_self_assigned_role(role):
    with pytest.raises(ValidationError):
        SignupRequest(
            email="student@example.com",
            password="a-good-password",
            full_name="Student One",
            role=role,
        )


# --- Session cookie ---------------------------------------------------------


def _set_cookie_header(response):
    return response.headers["set-cookie"]


def test_session_cookie_is_samesite_lax_in_production(monkeypatch, session_user):
    from fastapi import Response

    monkeypatch.setattr(auth_module.settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")

    response = Response()
    auth_module._issue_session(response, session_user)

    cookie = _set_cookie_header(response).lower()
    assert "samesite=lax" in cookie
    assert "samesite=none" not in cookie
    assert "secure" in cookie
    assert "httponly" in cookie


def test_session_cookie_is_samesite_lax_outside_production(monkeypatch, session_user):
    from fastapi import Response

    monkeypatch.setattr(auth_module.settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")

    response = Response()
    auth_module._issue_session(response, session_user)

    cookie = _set_cookie_header(response).lower()
    assert "samesite=lax" in cookie
    assert "secure" not in cookie


# --- /refresh removal -------------------------------------------------------


def test_refresh_endpoint_is_removed():
    """The endpoint traded any SECRET_KEY-signed token carrying `sub` — including
    emailed verification and password-reset tokens — for a full session."""
    refresh_routes = [
        route
        for route in auth_module.router.routes
        if getattr(route, "path", "").endswith("/refresh")
    ]

    assert refresh_routes == []
    assert not hasattr(auth_module, "refresh")


def test_refresh_schemas_are_removed():
    import app.schemas.auth as auth_schemas

    assert not hasattr(auth_schemas, "RefreshRequest")
    assert not hasattr(auth_schemas, "RefreshResponse")


# --- Production SECRET_KEY guard --------------------------------------------


def _build_settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


@pytest.mark.parametrize("placeholder", sorted(PLACEHOLDER_SECRET_KEYS))
def test_production_rejects_placeholder_secret_key(placeholder):
    with pytest.raises(ValidationError) as exc_info:
        _build_settings(ENVIRONMENT="production", SECRET_KEY=placeholder)

    assert "placeholder" in str(exc_info.value)


def test_production_rejects_short_secret_key():
    with pytest.raises(ValidationError) as exc_info:
        _build_settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * (SECRET_KEY_MIN_LENGTH - 1),
        )

    assert f"at least {SECRET_KEY_MIN_LENGTH} characters" in str(exc_info.value)


def test_production_accepts_strong_secret_key():
    strong_key = "s" * SECRET_KEY_MIN_LENGTH

    settings = _build_settings(ENVIRONMENT="production", SECRET_KEY=strong_key)

    assert settings.SECRET_KEY == strong_key


def test_development_still_boots_with_the_default_secret_key():
    """Local dev and the test suite rely on the checked-in default."""
    settings = _build_settings(ENVIRONMENT="development")

    assert settings.SECRET_KEY == "change-this-secret-key"
