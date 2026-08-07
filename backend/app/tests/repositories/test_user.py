"""Tests for app/repositories/user.py."""

import pytest

from app.core.database import SessionLocal
from app.core.security import verify_password
from app.repositories.user import user_repository


@pytest.mark.asyncio
async def test_get_by_email_finds_existing_user(student):
    async with SessionLocal() as db:
        found = await user_repository.get_by_email(db, email=student.email)

    assert found is not None
    assert found.id == student.id


@pytest.mark.asyncio
async def test_get_by_email_returns_none_for_missing_user(student):
    async with SessionLocal() as db:
        found = await user_repository.get_by_email(db, email="nobody@example.com")

    assert found is None


@pytest.mark.asyncio
async def test_get_by_oauth_identity_matches_provider_and_id(student):
    async with SessionLocal() as db:
        student.oauth_provider = "google"
        student.oauth_id = "google-abc-123"
        db.add(student)
        await db.commit()

    async with SessionLocal() as db:
        found = await user_repository.get_by_oauth_identity(
            db, provider="google", oauth_id="google-abc-123"
        )
        not_found = await user_repository.get_by_oauth_identity(
            db, provider="google", oauth_id="some-other-id"
        )

    assert found is not None
    assert found.id == student.id
    assert not_found is None


@pytest.mark.asyncio
async def test_create_user_hashes_password(student):
    from types import SimpleNamespace

    async with SessionLocal() as db:
        created = await user_repository.create_user(
            db,
            obj_in=SimpleNamespace(
                email="new-user@example.com",
                password="plaintext-secret",
                full_name="New User",
                role="student",
            ),
        )

    assert created.id is not None
    assert created.hashed_password != "plaintext-secret"
    assert verify_password("plaintext-secret", created.hashed_password)


@pytest.mark.asyncio
async def test_create_user_without_password_is_oauth_only(student):
    from types import SimpleNamespace

    async with SessionLocal() as db:
        created = await user_repository.create_user(
            db,
            obj_in=SimpleNamespace(
                email="oauth-only@example.com",
                password=None,
                full_name="OAuth User",
                role="student",
                oauth_provider="google",
                oauth_id="google-xyz",
            ),
        )

    assert created.hashed_password is None
    assert created.oauth_provider == "google"
