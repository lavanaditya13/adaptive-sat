from types import SimpleNamespace
from unittest.mock import AsyncMock
from urllib.parse import parse_qs, urlsplit

import pytest

from app.api.v1.endpoints import auth as auth_module
from app.services import oauth_service


@pytest.fixture
def apple_claims():
    return {
        "sub": "apple-user-123",
        "email": "apple.student@example.com",
        "email_verified": True,
    }


@pytest.mark.asyncio
async def test_apple_start_redirects_to_apple(monkeypatch):
    monkeypatch.setattr(auth_module.settings, "APPLE_CLIENT_ID", "com.example.web")
    monkeypatch.setattr(auth_module.settings, "APPLE_TEAM_ID", "TEAM123")
    monkeypatch.setattr(auth_module.settings, "APPLE_KEY_ID", "KEY123")
    monkeypatch.setattr(auth_module.settings, "APPLE_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----")
    monkeypatch.setattr(auth_module.settings, "APPLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/apple/callback")

    response = await auth_module.apple_start(intent="signup")
    parsed = urlsplit(response.headers["location"])
    params = parse_qs(parsed.query)

    assert parsed.netloc == "appleid.apple.com"
    assert params["client_id"] == ["com.example.web"]
    assert params["response_type"] == ["code"]
    assert params["response_mode"] == ["form_post"]
    assert params["scope"] == ["name email"]
    assert oauth_service._decode_oauth_state(params["state"][0], expected_provider="apple") == "signup"


@pytest.mark.asyncio
async def test_apple_callback_creates_new_apple_user(monkeypatch, apple_claims):
    created_user = SimpleNamespace(
        id=31,
        email=apple_claims["email"],
        full_name="Apple Student",
        role="student",
        email_verified=True,
        oauth_provider="apple",
        oauth_id=apple_claims["sub"],
    )

    monkeypatch.setattr(auth_module.settings, "APPLE_CLIENT_ID", "com.example.web")
    monkeypatch.setattr(auth_module.settings, "APPLE_TEAM_ID", "TEAM123")
    monkeypatch.setattr(auth_module.settings, "APPLE_KEY_ID", "KEY123")
    monkeypatch.setattr(auth_module.settings, "APPLE_PRIVATE_KEY", "dummy-key")
    monkeypatch.setattr(auth_module.settings, "APPLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/apple/callback")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "apple-session-token")

    monkeypatch.setattr(oauth_service, "_build_apple_client_secret", lambda: "apple-client-secret")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: {"id_token": "apple-id-token"},
        ),
    )
    monkeypatch.setattr(
        oauth_service.jwt,
        "get_unverified_claims",
        lambda token: apple_claims,
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

    state = oauth_service._create_oauth_state(provider="apple", intent="signup")
    request = SimpleNamespace(
        method="POST",
        query_params={},
        form=AsyncMock(
            return_value={
                "code": "apple-code",
                "state": state,
                "user": '{"name":{"firstName":"Apple","lastName":"Student"}}',
            }
        ),
    )

    response = await auth_module.apple_callback(request=request, db=SimpleNamespace())

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:5173/oauth/callback"
    assert "apple-session-token" in response.headers["set-cookie"]

    created_obj = create_user_mock.call_args.kwargs["obj_in"]
    assert created_obj.oauth_provider == "apple"
    assert created_obj.oauth_id == apple_claims["sub"]
    assert created_obj.password is None


@pytest.mark.asyncio
async def test_apple_callback_reuses_existing_link_without_name(monkeypatch, apple_claims):
    existing_linked_user = SimpleNamespace(
        id=45,
        email=apple_claims["email"],
        full_name="Stored Name",
        role="student",
        email_verified=True,
        oauth_provider="apple",
        oauth_id=apple_claims["sub"],
    )

    monkeypatch.setattr(auth_module.settings, "APPLE_CLIENT_ID", "com.example.web")
    monkeypatch.setattr(auth_module.settings, "APPLE_TEAM_ID", "TEAM123")
    monkeypatch.setattr(auth_module.settings, "APPLE_KEY_ID", "KEY123")
    monkeypatch.setattr(auth_module.settings, "APPLE_PRIVATE_KEY", "dummy-key")
    monkeypatch.setattr(auth_module.settings, "APPLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/apple/callback")
    monkeypatch.setattr(auth_module, "create_access_token", lambda user_id: "apple-session-token")

    monkeypatch.setattr(oauth_service, "_build_apple_client_secret", lambda: "apple-client-secret")
    monkeypatch.setattr(
        oauth_service.requests,
        "post",
        lambda *args, **kwargs: SimpleNamespace(
            status_code=200,
            json=lambda: {"id_token": "apple-id-token"},
        ),
    )
    monkeypatch.setattr(
        oauth_service.jwt,
        "get_unverified_claims",
        lambda token: apple_claims,
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "get_by_oauth_identity",
        AsyncMock(return_value=existing_linked_user),
    )
    update_mock = AsyncMock(return_value=existing_linked_user)
    monkeypatch.setattr(
        oauth_service.user_repository,
        "update",
        update_mock,
    )
    monkeypatch.setattr(
        oauth_service.user_repository,
        "create_user",
        AsyncMock(side_effect=AssertionError("create_user should not be called for existing linked apple user")),
    )

    state = oauth_service._create_oauth_state(provider="apple", intent="login")
    request = SimpleNamespace(
        method="POST",
        query_params={},
        form=AsyncMock(
            return_value={
                "code": "apple-code",
                "state": state,
            }
        ),
    )

    response = await auth_module.apple_callback(request=request, db=SimpleNamespace())

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:5173/oauth/callback"
    assert "apple-session-token" in response.headers["set-cookie"]
    update_mock.assert_awaited_once()
