from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException, Response

from app.api.v1.endpoints import auth as auth_module
from app.models.user import User
from app.services import auth_service as auth_service_module


def _make_user(*, password: str | None = "hashed", role: str = "student") -> User:
    return User(
        id=1,
        email="student@example.com",
        full_name="Student One",
        role=role,
        is_active=True,
        email_verified=False,
        oauth_provider=None,
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
    monkeypatch.setattr(
        auth_module,
        "issue_signup_verification_email",
        AsyncMock(return_value=None),
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

    assert result.user.user_id == 1
    assert result.user.email == "student@example.com"
    assert "set-cookie" not in response.headers


@pytest.mark.asyncio
async def test_signup_continues_when_verification_email_fails(monkeypatch):
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
    monkeypatch.setattr(
        auth_module,
        "issue_signup_verification_email",
        AsyncMock(side_effect=HTTPException(status_code=502, detail="email failed")),
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

    assert result.user.user_id == 1
    assert result.user.email == "student@example.com"


@pytest.mark.asyncio
async def test_login_rejects_unverified_password_user(monkeypatch):
    user = _make_user(password="hashed")
    user.email_verified = False
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(auth_module, "verify_password", lambda plain, hashed: True)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.login(
            SimpleNamespace(email="student@example.com", role="student", password="secret"),
            response,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["code"] == "account_unverified"


@pytest.mark.asyncio
async def test_signup_unverified_existing_user_returns_actionable_conflict(monkeypatch):
    existing_user = _make_user(password="hashed")
    existing_user.email_verified = False
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=existing_user),
    )
    resend_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(auth_module, "issue_signup_verification_email", resend_mock)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.signup(
            SimpleNamespace(
                email="student@example.com",
                password="secret",
                full_name="Student One",
                role="student",
            ),
            response,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["code"] == "account_unverified"
    resend_mock.assert_awaited_once_with(existing_user)


@pytest.mark.asyncio
async def test_signup_existing_oauth_only_user_returns_google_message(monkeypatch):
    existing_user = _make_user(password=None)
    existing_user.oauth_provider = "google"
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=existing_user),
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.signup(
            SimpleNamespace(
                email="student@example.com",
                password="secret",
                full_name="Student One",
                role="student",
            ),
            response,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 400
    assert "Google" in exc_info.value.detail


@pytest.mark.asyncio
async def test_resend_verification_by_email_returns_no_content(monkeypatch):
    resend_mock = AsyncMock(return_value=True)
    monkeypatch.setattr(auth_module, "resend_verification_email_by_address", resend_mock)

    result = await auth_module.resend_verification_by_email(
        SimpleNamespace(email="student@example.com"),
        db=SimpleNamespace(),
    )

    assert result is None
    resend_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_resend_verification_by_email_propagates_send_failure(monkeypatch):
    monkeypatch.setattr(
        auth_module,
        "resend_verification_email_by_address",
        AsyncMock(
            side_effect=HTTPException(
                status_code=502,
                detail="Failed to send email via Resend",
            )
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.resend_verification_by_email(
            SimpleNamespace(email="student@example.com"),
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_forgot_password_requests_reset_email_for_verified_password_user(monkeypatch):
    user = _make_user(password="hashed")
    user.email_verified = True
    send_mock = AsyncMock(return_value=None)
    db = SimpleNamespace()

    monkeypatch.setattr(
        auth_module.user_repository,
        "get_by_email",
        AsyncMock(return_value=user),
    )
    monkeypatch.setattr(auth_module, "request_password_reset_email_by_address", send_mock)

    result = await auth_module.forgot_password(
        SimpleNamespace(email="student@example.com"),
        db=db,
    )

    assert result is None
    send_mock.assert_awaited_once_with(db, "student@example.com")


@pytest.mark.asyncio
async def test_reset_password_updates_password_hash(monkeypatch):
    user = _make_user(password="hashed")
    updated_user = _make_user(password="new-hashed")

    monkeypatch.setattr(auth_service_module, "decode_password_reset_token", lambda token: 1)
    monkeypatch.setattr(
        auth_service_module.user_repository,
        "get",
        AsyncMock(return_value=user),
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
async def test_login_succeeds_for_password_users(monkeypatch):
    user = _make_user(password="hashed")
    user.email_verified = True
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