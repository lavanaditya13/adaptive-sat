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
        topic = Topic(code=code, name="Test Topic", section="math")
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
        cleanup_after.append((Topic, topic.id))

    async with SessionLocal() as db:
        found = await topic_repository.get_by_code(db, code=code)

    assert found is not None
    assert found.id == topic.id
    assert found.section == "math"


@pytest.mark.asyncio
async def test_topic_section_is_nullable_for_legacy_rows(
    _skip_without_postgres, cleanup_after
):
    """A topic with no derivable section (pre-migration, no linked question)
    must still be persistable -- topics.section stays nullable at the DB
    level for exactly this case; see the migration docstring."""
    code = f"TEST_TOPIC_NO_SECTION_{uuid.uuid4().hex[:8]}"

    async with SessionLocal() as db:
        topic = Topic(code=code, name="No Section Topic")
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
        cleanup_after.append((Topic, topic.id))

    assert topic.section is None


@pytest.mark.asyncio
async def test_parent_topic_id_expresses_domain_skill_hierarchy(
    _skip_without_postgres, cleanup_after
):
    domain_code = f"TEST_DOMAIN_{uuid.uuid4().hex[:8]}"
    skill_code = f"TEST_SKILL_{uuid.uuid4().hex[:8]}"

    async with SessionLocal() as db:
        domain = Topic(code=domain_code, name="Test Domain", section="math")
        db.add(domain)
        await db.flush()

        skill = Topic(
            code=skill_code,
            name="Test Skill",
            section="math",
            parent_topic_id=domain.id,
        )
        db.add(skill)
        await db.commit()
        await db.refresh(domain)
        await db.refresh(skill)
        cleanup_after.append((Topic, skill.id))
        cleanup_after.append((Topic, domain.id))

    assert skill.parent_topic_id == domain.id


@pytest.mark.asyncio
async def test_get_by_code_returns_none_for_missing_code(_skip_without_postgres):
    async with SessionLocal() as db:
        found = await topic_repository.get_by_code(db, code="DOES_NOT_EXIST_TOPIC")

    assert found is None
