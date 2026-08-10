"""Endpoint-layer tests for app/api/v1/endpoints/auth.py.

These call the route handler functions directly (auth_module.signup, .login,
etc.) with mocked repositories/services, rather than going through
TestClient — matches the style already established for this router. Tests
for the underlying service logic (auth_service, oauth_service) live in
tests/services/ instead; see that split before adding new cases here.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException, Response
from jose import jwt

from app.api.v1.endpoints import auth as auth_module
from app.models.user import User
from app.schemas.auth import VerifyEmailRequest
from app.services import auth_service, oauth_service


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


@pytest.mark.asyncio
async def test_signup_returns_session_and_user(monkeypatch):
    created_user = _make_user(password="hashed")
    response = Response()

    monkeypatch.setattr(
        auth_module.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        auth_module.user_repository, "create_user", AsyncMock(return_value=created_user)
    )
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")
    monkeypatch.setattr(
        auth_module, "issue_signup_verification_email", AsyncMock(return_value=None)
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
        auth_module.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        auth_module.user_repository, "create_user", AsyncMock(return_value=created_user)
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
async def test_signup_triggers_verification_email(monkeypatch, unverified_user):
    response = Response()
    called = {}

    monkeypatch.setattr(
        auth_module.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        auth_module.user_repository, "create_user", AsyncMock(return_value=unverified_user)
    )
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "token-123")

    async def capture_issue_signup_verification_email(user):
        called["user"] = user

    monkeypatch.setattr(
        auth_module, "issue_signup_verification_email", capture_issue_signup_verification_email
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
async def test_login_rejects_unverified_password_user(monkeypatch):
    user = _make_user(password="hashed")
    user.email_verified = False
    response = Response()

    monkeypatch.setattr(auth_module.user_repository, "get_by_email", AsyncMock(return_value=user))
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
        auth_module.user_repository, "get_by_email", AsyncMock(return_value=existing_user)
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
        auth_module.user_repository, "get_by_email", AsyncMock(return_value=existing_user)
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
            side_effect=HTTPException(status_code=502, detail="Failed to send email via Resend")
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

    monkeypatch.setattr(auth_module.user_repository, "get_by_email", AsyncMock(return_value=user))
    monkeypatch.setattr(auth_module, "request_password_reset_email_by_address", send_mock)

    result = await auth_module.forgot_password(
        SimpleNamespace(email="student@example.com"),
        db=db,
    )

    assert result is None
    send_mock.assert_awaited_once_with(db, "student@example.com")


@pytest.mark.asyncio
async def test_login_succeeds_for_password_users(monkeypatch):
    user = _make_user(password="hashed")
    user.email_verified = True
    response = Response()

    monkeypatch.setattr(auth_module.user_repository, "get_by_email", AsyncMock(return_value=user))
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

    monkeypatch.setattr(auth_module.user_repository, "get_by_email", AsyncMock(return_value=user))

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


@pytest.mark.asyncio
async def test_verify_email_endpoint_marks_user_verified(monkeypatch, unverified_user):
    token = auth_service.create_email_verification_token(unverified_user.id)
    updated_user = SimpleNamespace(**unverified_user.__dict__)
    updated_user.email_verified = True
    response = Response()

    monkeypatch.setattr(
        auth_service.user_repository, "get", AsyncMock(return_value=unverified_user)
    )
    monkeypatch.setattr(
        auth_service.user_repository, "update", AsyncMock(return_value=updated_user)
    )

    result = await auth_module.verify_email_endpoint(
        VerifyEmailRequest(token=token),
        response,
        db=SimpleNamespace(),
    )

    assert result.user.email_verified is True
    auth_service.user_repository.update.assert_awaited_once()
    assert "set-cookie" in response.headers


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

    response = Response()

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.verify_email_endpoint(
            VerifyEmailRequest(token=expired_token),
            response,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.detail.lower()


@pytest.fixture
def google_profile():
    return {
        "email": "student@example.com",
        "sub": "google-sub-123",
        "name": "Google Student",
        "email_verified": True,
    }


@pytest.mark.asyncio
async def test_google_start_redirects_to_google(monkeypatch):
    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(
        auth_module.settings,
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/v1/auth/google/callback",
    )

    response = await auth_module.google_start(intent="signup")
    parsed = urlsplit(response.headers["location"])
    params = parse_qs(parsed.query)

    assert parsed.netloc == "accounts.google.com"
    assert params["client_id"] == ["client-id"]
    assert params["redirect_uri"] == ["http://localhost:8000/api/v1/auth/google/callback"]
    assert params["response_type"] == ["code"]
    assert "openid" in params["scope"][0]
    assert "email" in params["scope"][0]
    assert "profile" in params["scope"][0]
    assert oauth_service._decode_oauth_state(params["state"][0], expected_provider="google") == "signup"


@pytest.mark.asyncio
async def test_google_callback_creates_new_google_user(monkeypatch, google_profile):
    created_user = SimpleNamespace(
        id=11,
        email=google_profile["email"],
        full_name=google_profile["name"],
        role="student",
        email_verified=True,
        oauth_provider="google",
        oauth_id=google_profile["sub"],
    )

    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(
        auth_module.settings,
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/v1/auth/google/callback",
    )
    monkeypatch.setattr(auth_module.settings, "FRONTEND_URL", "http://localhost:5173")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "session-token")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200, json=lambda: {"access_token": "google-access-token"}
        ),
    )
    monkeypatch.setattr(
        oauth_service.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(status_code=200, json=lambda: google_profile),
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    create_user_mock = AsyncMock(return_value=created_user)
    monkeypatch.setattr(oauth_service.user_repository, "create_user", create_user_mock)

    state = oauth_service._create_oauth_state(provider="google", intent="login")
    response = await auth_module.google_callback(
        request=SimpleNamespace(cookies={}),
        code="oauth-code",
        state=state,
        db=SimpleNamespace(),
    )

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:5173/oauth/callback"
    assert "session-token" in response.headers["set-cookie"]

    created_obj = create_user_mock.call_args.kwargs["obj_in"]
    assert created_obj.password is None
    assert created_obj.oauth_provider == "google"
    assert created_obj.oauth_id == google_profile["sub"]
    assert created_obj.email_verified is True


@pytest.mark.asyncio
async def test_google_callback_existing_password_email_returns_conflict(monkeypatch, google_profile):
    existing_user = SimpleNamespace(
        id=22,
        email=google_profile["email"],
        full_name="Existing Student",
        role="student",
        email_verified=False,
        oauth_provider=None,
        oauth_id=None,
        hashed_password="hashed-password",
    )
    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setattr(auth_module.settings, "GOOGLE_CLIENT_SECRET", "client-secret")
    monkeypatch.setattr(
        auth_module.settings,
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/api/v1/auth/google/callback",
    )
    monkeypatch.setattr(auth_module.settings, "FRONTEND_URL", "http://localhost:5173")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "session-token")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200, json=lambda: {"access_token": "google-access-token"}
        ),
    )
    monkeypatch.setattr(
        oauth_service.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(status_code=200, json=lambda: google_profile),
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_email", AsyncMock(return_value=existing_user)
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "create_user",
        AsyncMock(side_effect=AssertionError("create_user should not be called for existing email user")),
    )

    state = oauth_service._create_oauth_state(provider="google", intent="login")
    response = await auth_module.google_callback(
        request=SimpleNamespace(cookies={}),
        code="oauth-code",
        state=state,
        db=SimpleNamespace(),
    )

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:5173/oauth/callback?status=error&reason=email_conflict"
    assert "set-cookie" not in response.headers
