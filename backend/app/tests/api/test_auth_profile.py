"""Tests for PATCH /api/v1/auth/me (profile name update).

The happy path calls the endpoint function directly with a mocked repository
(the style used by tests/api/test_auth.py), while validation and
authentication are exercised through TestClient -- those two live in the
request layer, so calling the function directly would bypass exactly what is
under test.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import auth as auth_module
from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.schemas.auth import UpdateProfileRequest

ENDPOINT = "/api/v1/auth/me"


def _make_user(**overrides):
    base = {
        "id": 7,
        "email": "student@example.com",
        "full_name": "Alex Chen",
        "role": "student",
        "email_verified": True,
        "oauth_provider": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


@pytest.fixture
def client_as_user():
    """TestClient with an authenticated user and a stubbed DB session."""
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: SimpleNamespace()
    try:
        yield TestClient(app), user
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_update_me_persists_composed_full_name(monkeypatch):
    user = _make_user()
    update_mock = AsyncMock(side_effect=lambda **kwargs: _make_user(full_name="Alex Rivera"))
    monkeypatch.setattr(
        "app.services.user_service.user_repository.update",
        update_mock,
    )

    response = await auth_module.update_me(
        payload=UpdateProfileRequest(first_name="Alex", last_name="Rivera"),
        current_user=user,
        db=SimpleNamespace(),
    )

    assert update_mock.call_args.kwargs["obj_in"] == {"full_name": "Alex Rivera"}
    assert update_mock.call_args.kwargs["db_obj"] is user
    assert response.full_name == "Alex Rivera"
    assert response.user_id == 7
    assert response.email == "student@example.com"
    assert response.role == "student"


@pytest.mark.asyncio
async def test_update_me_trims_input_and_allows_a_mononym(monkeypatch):
    user = _make_user()
    update_mock = AsyncMock(side_effect=lambda **kwargs: _make_user(full_name="Cher"))
    monkeypatch.setattr(
        "app.services.user_service.user_repository.update",
        update_mock,
    )

    await auth_module.update_me(
        payload=UpdateProfileRequest(first_name="  Cher  ", last_name="   "),
        current_user=user,
        db=SimpleNamespace(),
    )

    assert update_mock.call_args.kwargs["obj_in"] == {"full_name": "Cher"}


@pytest.mark.parametrize(
    "payload",
    [
        {"first_name": "", "last_name": "Chen"},
        {"first_name": "   ", "last_name": "Chen"},
        {"last_name": "Chen"},
        {"first_name": "A" * 101, "last_name": "Chen"},
        {"first_name": "Alex", "last_name": "B" * 101},
    ],
    ids=["blank", "whitespace-only", "missing", "first-name-too-long", "last-name-too-long"],
)
def test_update_me_rejects_invalid_names(client_as_user, payload):
    client, _ = client_as_user

    response = client.patch(ENDPOINT, json=payload)

    assert response.status_code == 422


def test_update_me_requires_authentication():
    client = TestClient(app)

    response = client.patch(ENDPOINT, json={"first_name": "Alex", "last_name": "Rivera"})

    assert response.status_code == 401
