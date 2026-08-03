from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, Response
from jose import jwt

from app.api.v1.endpoints import auth as auth_module
from app.schemas.auth import VerifyEmailRequest
from app.services import auth_service


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
async def test_signup_triggers_verification_email(monkeypatch, unverified_user):
    response = Response()
    called = {}

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        auth_module.user_repository,
        "create_user",
        AsyncMock(return_value=unverified_user),
    )
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")

    async def capture_issue_signup_verification_email(user):
        called["user"] = user

    monkeypatch.setattr(
        auth_module,
        "issue_signup_verification_email",
        capture_issue_signup_verification_email,
    )

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

    assert result.user.email_verified is False
    assert called["user"] == unverified_user


@pytest.mark.asyncio
async def test_send_verification_email_builds_resend_message(monkeypatch, unverified_user):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)
        return {"id": "email_123"}

    monkeypatch.setattr(auth_service, "send_email", fake_send_email)

    await auth_service.send_verification_email(unverified_user)

    assert captured["to"] == "student@example.com"
    assert captured["subject"] == auth_service.DEFAULT_VERIFICATION_SUBJECT
    assert "Verify my email" in captured["html"]
    assert "/verify-email?token=" in captured["html"]


@pytest.mark.asyncio
async def test_verify_email_endpoint_marks_user_verified(monkeypatch, unverified_user):
    token = auth_service.create_email_verification_token(unverified_user.id)
    updated_user = SimpleNamespace(**unverified_user.__dict__)
    updated_user.email_verified = True

    monkeypatch.setattr(
        auth_service.user_repository,
        "get",
        AsyncMock(return_value=unverified_user),
    )
    monkeypatch.setattr(
        auth_service.user_repository,
        "update",
        AsyncMock(return_value=updated_user),
    )

    result = await auth_module.verify_email_endpoint(
        VerifyEmailRequest(token=token),
        db=SimpleNamespace(),
    )

    assert result.user.email_verified is True
    auth_service.user_repository.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_verify_email_rejects_expired_token(monkeypatch):
    expired_token = jwt.encode(
        {
            "sub": "7",
            "purpose": auth_service.EMAIL_VERIFICATION_PURPOSE,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        auth_module.settings.SECRET_KEY,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.verify_email_endpoint(
            VerifyEmailRequest(token=expired_token),
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_resend_verification_noops_for_verified_user(monkeypatch, verified_user):
    called = False

    async def fake_send_verification_email(user):
        nonlocal called
        called = True

    monkeypatch.setattr(
        auth_service,
        "send_verification_email",
        fake_send_verification_email,
    )

    result = await auth_service.resend_verification_email(SimpleNamespace(), verified_user)

    assert result is False
    assert called is False


@pytest.mark.asyncio
async def test_resend_verification_sends_for_unverified_user(monkeypatch, unverified_user):
    called = {}

    async def fake_send_verification_email(user):
        called["user"] = user

    monkeypatch.setattr(
        auth_service,
        "send_verification_email",
        fake_send_verification_email,
    )

    result = await auth_service.resend_verification_email(SimpleNamespace(), unverified_user)

    assert result is True
    assert called["user"] == unverified_user
