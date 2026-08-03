from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, Response

from app.api.v1.endpoints import auth as auth_module
from app.models.user import User


def _make_user(*, password: str | None = "hashed", role: str = "student") -> User:
    return User(
        id=1,
        email="student@example.com",
        full_name="Student One",
        role=role,
        is_active=True,
        email_verified=False,
        hashed_password=password,
    )


@pytest.mark.asyncio
async def test_signup_returns_session_and_user(monkeypatch):
    created_user = _make_user(password="hashed")
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        auth_module.user_repository,
        "create_user",
        AsyncMock(return_value=created_user),
    )
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")

    result = await auth_module.signup(
        SimpleNamespace(
            email="student@example.com",
            password="secret",
            full_name="Student One",
            role="student",
        ),
        response,
        db=SimpleNamespace(),
    )

    assert result.access_token == "token-123"
    assert result.user.email == "student@example.com"
    assert response.headers["set-cookie"].startswith("access_token=token-123")


@pytest.mark.asyncio
async def test_login_succeeds_for_password_users(monkeypatch):
    user = _make_user(password="hashed")
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(auth_module, "verify_password", lambda plain, hashed: True)
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-456")

    result = await auth_module.login(
        SimpleNamespace(email="student@example.com", role="student", password="secret"),
        response,
        db=SimpleNamespace(),
    )

    assert result.access_token == "token-456"
    assert result.user.user_id == 1


@pytest.mark.asyncio
async def test_login_rejects_oauth_only_users(monkeypatch):
    user = _make_user(password=None)
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=user),
    )

    def fail_if_called(*args, **kwargs):
        raise AssertionError("verify_password should not be called for OAuth-only users")

    monkeypatch.setattr(auth_module, "verify_password", fail_if_called)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.login(
            SimpleNamespace(email="student@example.com", role="student", password="secret"),
            response,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 401