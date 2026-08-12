"""Tests for app/services/oauth_service.py.

Endpoint-layer OAuth flow tests (calling auth_module.google_start/
.google_callback) live in tests/api/test_auth.py. This file is for
oauth_service's own functions -- notably the IntegrityError -> conflict
translation added to close the concurrent-OAuth-identity race (see
alembic/versions/3ba3aae2a43a_*.py and the "no unguarded race conditions"
backend rule).
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.services import oauth_service
from app.services.oauth_service import (
    OAuthProviderConflictError,
    OAuthProviderError,
    _link_oauth_to_current_user,
    _upsert_oauth_user,
)


def _fake_integrity_error() -> IntegrityError:
    return IntegrityError("INSERT INTO users ...", {}, Exception("duplicate key value"))


@pytest.mark.asyncio
async def test_upsert_oauth_user_creates_new_user_when_none_exists(monkeypatch):
    created_user = SimpleNamespace(id=1, email="student@example.com", oauth_provider="google")
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    create_mock = AsyncMock(return_value=created_user)
    monkeypatch.setattr(oauth_service.user_repository, "create_user", create_mock)

    result = await _upsert_oauth_user(
        db,
        provider="google",
        provider_id="google-123",
        email="student@example.com",
        full_name="Student",
        email_verified=True,
    )

    assert result is created_user
    create_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_oauth_user_updates_existing_provider_user(monkeypatch):
    existing_user = SimpleNamespace(id=1, full_name="Existing Name")
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=existing_user)
    )
    update_mock = AsyncMock(return_value=existing_user)
    monkeypatch.setattr(oauth_service.user_repository, "update", update_mock)

    result = await _upsert_oauth_user(
        db,
        provider="google",
        provider_id="google-123",
        email="student@example.com",
        full_name=None,
        email_verified=True,
    )

    assert result is existing_user
    update_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_oauth_user_raises_without_email_and_no_existing_link(monkeypatch):
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )

    with pytest.raises(OAuthProviderError):
        await _upsert_oauth_user(
            db,
            provider="google",
            provider_id="google-123",
            email=None,
            full_name=None,
            email_verified=True,
        )


@pytest.mark.asyncio
async def test_upsert_oauth_user_converts_integrity_error_to_conflict(monkeypatch):
    """The race this guards: two concurrent OAuth callbacks for the same new
    identity both pass the pre-checks, and the second INSERT loses to the
    unique index on users(oauth_provider, oauth_id) -- this must surface as
    a clean OAuthProviderConflictError, not an unhandled IntegrityError."""
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_email", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "create_user", AsyncMock(side_effect=_fake_integrity_error())
    )

    with pytest.raises(OAuthProviderConflictError):
        await _upsert_oauth_user(
            db,
            provider="google",
            provider_id="google-123",
            email="student@example.com",
            full_name="Student",
            email_verified=True,
        )

    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_link_oauth_to_current_user_rejects_identity_linked_to_someone_else(monkeypatch):
    current_user = SimpleNamespace(id=1, oauth_provider=None, full_name="Student")
    other_user = SimpleNamespace(id=2)
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=other_user)
    )

    with pytest.raises(OAuthProviderConflictError):
        await _link_oauth_to_current_user(
            db,
            current_user=current_user,
            provider="google",
            provider_id="google-123",
            full_name=None,
            email_verified=True,
        )


@pytest.mark.asyncio
async def test_link_oauth_to_current_user_converts_integrity_error_to_conflict(monkeypatch):
    """The race this guards: two different users' link flows racing for the
    same provider identity both pass the pre-check before either commits."""
    current_user = SimpleNamespace(id=1, oauth_provider=None, full_name="Student")
    db = AsyncMock()

    monkeypatch.setattr(
        oauth_service.user_repository, "get_by_oauth_identity", AsyncMock(return_value=None)
    )
    monkeypatch.setattr(
        oauth_service.user_repository, "update", AsyncMock(side_effect=_fake_integrity_error())
    )

    with pytest.raises(OAuthProviderConflictError):
        await _link_oauth_to_current_user(
            db,
            current_user=current_user,
            provider="google",
            provider_id="google-123",
            full_name=None,
            email_verified=True,
        )

    db.rollback.assert_awaited_once()
