from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import settings as settings_module


def _make_user(**overrides):
    base = {
        "id": 1,
        "email": "student@example.com",
        "full_name": "Student",
        "hashed_password": "$2b$12$abc",
        "oauth_provider": None,
        "oauth_id": None,
        "email_verified": True,
        "updated_at": datetime.now(timezone.utc),
    }
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.mark.asyncio
async def test_list_connected_providers_empty():
    user = _make_user()

    result = await settings_module.get_connected_providers(current_user=user)

    assert result.providers == []
    assert result.has_password is True


@pytest.mark.asyncio
async def test_list_connected_providers_with_google():
    user = _make_user(oauth_provider="google", oauth_id="google-123")

    result = await settings_module.get_connected_providers(current_user=user)

    assert result.has_password is True
    assert len(result.providers) == 1
    assert result.providers[0].provider == "google"
    assert result.providers[0].email == "student@example.com"
    assert result.providers[0].linked_at


@pytest.mark.asyncio
async def test_start_link_google_redirects(monkeypatch):
    user = _make_user()

    monkeypatch.setattr(
        settings_module,
        "build_google_authorization_url",
        lambda intent: "https://accounts.google.com/o/oauth2/v2/auth?state=abc",
    )

    response = await settings_module.start_provider_link(
        provider="google",
        intent="link",
        current_user=user,
    )

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://accounts.google.com/")


@pytest.mark.asyncio
async def test_unlink_provider_success(monkeypatch):
    user = _make_user(oauth_provider="google", oauth_id="google-123")

    update_mock = AsyncMock(return_value=user)
    monkeypatch.setattr(settings_module.user_repository, "update", update_mock)

    response = await settings_module.unlink_provider(
        provider="google",
        current_user=user,
        db=SimpleNamespace(),
    )

    assert response is None
    update_payload = update_mock.call_args.kwargs["obj_in"]
    assert update_payload["oauth_provider"] is None
    assert update_payload["oauth_id"] is None


@pytest.mark.asyncio
async def test_unlink_provider_last_auth_method_guard():
    user = _make_user(
        oauth_provider="google",
        oauth_id="google-123",
        hashed_password=None,
    )

    with pytest.raises(HTTPException) as exc_info:
        await settings_module.unlink_provider(
            provider="google",
            current_user=user,
            db=SimpleNamespace(),
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "Cannot unlink your only sign-in method."
