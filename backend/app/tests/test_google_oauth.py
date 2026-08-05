from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import pytest

from app.api.v1.endpoints import auth as auth_module
from app.services import oauth_service


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
    monkeypatch.setattr(auth_module.settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")

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
    monkeypatch.setattr(auth_module.settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")
    monkeypatch.setattr(auth_module.settings, "FRONTEND_URL", "http://localhost:5173")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "session-token")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: {"access_token": "google-access-token"},
        ),
    )
    monkeypatch.setattr(
        oauth_service.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: google_profile,
        ),
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "get_by_oauth_identity",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "get_by_email",
        AsyncMock(return_value=None),
    )
    create_user_mock = AsyncMock(return_value=created_user)
    monkeypatch.setattr(
        oauth_service.user_repository,
        "create_user",
        create_user_mock,
    )

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
    monkeypatch.setattr(auth_module.settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")
    monkeypatch.setattr(auth_module.settings, "FRONTEND_URL", "http://localhost:5173")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "session-token")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: {"access_token": "google-access-token"},
        ),
    )
    monkeypatch.setattr(
        oauth_service.requests,
        "get",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: google_profile,
        ),
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "get_by_oauth_identity",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "get_by_email",
        AsyncMock(return_value=existing_user),
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
