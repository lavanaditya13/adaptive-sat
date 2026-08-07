"""Tests for app/repositories/topic.py."""

import uuid

import pytest

from app.core.database import SessionLocal
from app.models.topic import Topic
from app.repositories.topic import topic_repository


@pytest.mark.asyncio
async def test_get_by_code_finds_existing_topic(_skip_without_postgres, cleanup_after):
    code = f"TEST_TOPIC_{uuid.uuid4().hex[:8]}"

    async with SessionLocal() as db:
        topic = Topic(code=code, name="Test Topic")
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
        cleanup_after.append((Topic, topic.id))

    async with SessionLocal() as db:
        found = await topic_repository.get_by_code(db, code=code)

    assert found is not None
    assert found.id == topic.id


@pytest.mark.asyncio
async def test_get_by_code_returns_none_for_missing_code(_skip_without_postgres):
    async with SessionLocal() as db:
        found = await topic_repository.get_by_code(db, code="DOES_NOT_EXIST_TOPIC")

    assert found is None
