"""Tests for app/repositories/base.py's generic CRUD.

Exercised through TopicRepository (a thin BaseRepository[Topic] subclass)
since BaseRepository itself is never instantiated directly -- every concrete
repository in app/repositories/ shares this same generic implementation, so
this file is what actually pins its behavior down.
"""

import uuid

import pytest

from app.core.database import SessionLocal
from app.models.topic import Topic
from app.repositories.topic import topic_repository


@pytest.mark.asyncio
async def test_create_persists_and_returns_the_object(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        created = await topic_repository.create(
            db, obj_in={"code": f"BASE_CREATE_{uuid.uuid4().hex[:8]}", "name": "Base Create Topic"}
        )
        cleanup_after.append((Topic, created.id))

    assert created.id is not None
    assert created.name == "Base Create Topic"


@pytest.mark.asyncio
async def test_get_fetches_by_primary_key(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        created = await topic_repository.create(
            db, obj_in={"code": f"BASE_GET_{uuid.uuid4().hex[:8]}", "name": "Base Get Topic"}
        )
        cleanup_after.append((Topic, created.id))

    async with SessionLocal() as db:
        fetched = await topic_repository.get(db, created.id)

    assert fetched is not None
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_returns_none_for_missing_id(_skip_without_postgres):
    async with SessionLocal() as db:
        fetched = await topic_repository.get(db, 999_999_999)

    assert fetched is None


@pytest.mark.asyncio
async def test_update_modifies_only_provided_fields(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        created = await topic_repository.create(
            db,
            obj_in={
                "code": f"BASE_UPDATE_{uuid.uuid4().hex[:8]}",
                "name": "Original Name",
                "description": "Original description",
            },
        )
        cleanup_after.append((Topic, created.id))

    async with SessionLocal() as db:
        refetched = await topic_repository.get(db, created.id)
        updated = await topic_repository.update(
            db, db_obj=refetched, obj_in={"name": "Updated Name"}
        )

    assert updated.name == "Updated Name"
    assert updated.description == "Original description"


@pytest.mark.asyncio
async def test_remove_deletes_the_object(_skip_without_postgres):
    async with SessionLocal() as db:
        created = await topic_repository.create(
            db, obj_in={"code": f"BASE_REMOVE_{uuid.uuid4().hex[:8]}", "name": "Base Remove Topic"}
        )

    async with SessionLocal() as db:
        removed = await topic_repository.remove(db, id=created.id)

    assert removed.id == created.id

    async with SessionLocal() as db:
        fetched_after_remove = await topic_repository.get(db, created.id)

    assert fetched_after_remove is None


@pytest.mark.asyncio
async def test_get_multi_respects_skip_and_limit(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        for _ in range(3):
            created = await topic_repository.create(
                db, obj_in={"code": f"BASE_MULTI_{uuid.uuid4().hex[:8]}", "name": "Base Multi Topic"}
            )
            cleanup_after.append((Topic, created.id))

    async with SessionLocal() as db:
        page = await topic_repository.get_multi(db, skip=0, limit=2)

    assert len(page) == 2
