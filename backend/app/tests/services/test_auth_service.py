"""Service-layer tests for app/services/auth_service.py.

Endpoint-layer tests (calling auth_module.signup/.login/etc. directly) live
in tests/api/test_auth.py instead — this file is for auth_service functions
called and asserted on directly.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services import auth_service as auth_service_module


@pytest.fixture
def unverified_user():
    return SimpleNamespace(
        id=7,
        email="student@example.com",
        full_name="Student One",
        role="student",
        email_verified=False,
        oauth_provider=None,
    )


@pytest.fixture
def verified_user():
    return SimpleNamespace(
        id=7,
        email="student@example.com",
        full_name="Student One",
        role="student",
        email_verified=True,
        oauth_provider=None,
    )


@pytest.mark.asyncio
async def test_reset_password_updates_password_hash(monkeypatch):
    user = SimpleNamespace(id=1, hashed_password="hashed")
    updated_user = SimpleNamespace(id=1, hashed_password="new-hashed")

    monkeypatch.setattr(auth_service_module, "decode_password_reset_token", lambda token: 1)
    monkeypatch.setattr(
        auth_service_module.user_repository, "get", AsyncMock(return_value=user)
    )
    update_mock = AsyncMock(return_value=updated_user)
    monkeypatch.setattr(auth_service_module.user_repository, "update", update_mock)
    monkeypatch.setattr(auth_service_module, "get_password_hash", lambda password: "new-hashed")

    result = await auth_service_module.reset_password(
        db=SimpleNamespace(),
        token="reset-token",
        new_password="new-secret",
    )

    assert result.hashed_password == "new-hashed"
    update_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_reset_password_rejects_oauth_only_user(monkeypatch):
    user = SimpleNamespace(id=1, hashed_password=None)

    monkeypatch.setattr(auth_service_module, "decode_password_reset_token", lambda token: 1)
    monkeypatch.setattr(
        auth_service_module.user_repository, "get", AsyncMock(return_value=user)
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_service_module.reset_password(
            db=SimpleNamespace(), token="reset-token", new_password="new-secret"
        )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_send_verification_email_builds_resend_message(monkeypatch, unverified_user):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"id": "email_123"}

    monkeypatch.setattr(auth_service_module, "send_email", fake_send_email)

    await auth_service_module.send_verification_email(unverified_user)

    assert captured["to"] == "student@example.com"
    assert captured["subject"] == auth_service_module.DEFAULT_VERIFICATION_SUBJECT
    assert "Verify my email" in captured["html"]
    assert "/verify-email?token=" in captured["html"]


@pytest.mark.asyncio
async def test_send_password_reset_email_builds_resend_message(monkeypatch, verified_user):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"id": "email_456"}

    monkeypatch.setattr(auth_service_module, "send_email", fake_send_email)

    await auth_service_module.send_password_reset_email(verified_user)

    assert captured["to"] == "student@example.com"
    assert captured["subject"] == auth_service_module.DEFAULT_PASSWORD_RESET_SUBJECT
    assert "Reset my password" in captured["html"]
    assert "/reset-password?token=" in captured["html"]


@pytest.mark.asyncio
async def test_resend_verification_noops_for_verified_user(monkeypatch, verified_user):
    called = False

    async def fake_send_verification_email(user):
        nonlocal called
        called = True

    monkeypatch.setattr(auth_service_module, "send_verification_email", fake_send_verification_email)

    result = await auth_service_module.resend_verification_email(SimpleNamespace(), verified_user)

    assert result is False
    assert called is False


@pytest.mark.asyncio
async def test_resend_verification_sends_for_unverified_user(monkeypatch, unverified_user):
    called = {}

    async def fake_send_verification_email(user):
        called["user"] = user

    monkeypatch.setattr(auth_service_module, "send_verification_email", fake_send_verification_email)

    result = await auth_service_module.resend_verification_email(SimpleNamespace(), unverified_user)

    assert result is True
    assert called["user"] == unverified_user


@pytest.mark.asyncio
async def test_issue_signup_verification_email_propagates_failure(monkeypatch, unverified_user):
    async def fail_missing_key(user):
        raise HTTPException(
            status_code=502,
            detail="RESEND_API_KEY is not configured. Set it before sending email.",
        )

    monkeypatch.setattr(auth_service_module, "send_verification_email", fail_missing_key)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service_module.issue_signup_verification_email(unverified_user)

    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_resend_verification_email_by_address_noop_for_missing_email(monkeypatch):
    monkeypatch.setattr(
        auth_service_module.user_repository, "get_by_email", AsyncMock(return_value=None)
    )

    result = await auth_service_module.resend_verification_email_by_address(
        SimpleNamespace(), "missing@example.com"
    )

    assert result is False


@pytest.mark.asyncio
async def test_resend_verification_email_by_address_sends_for_unverified(monkeypatch, unverified_user):
    monkeypatch.setattr(
        auth_service_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=unverified_user),
    )
    send_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(auth_service_module, "send_verification_email", send_mock)

    result = await auth_service_module.resend_verification_email_by_address(
        SimpleNamespace(), unverified_user.email
    )

    assert result is True
    send_mock.assert_awaited_once_with(unverified_user)
