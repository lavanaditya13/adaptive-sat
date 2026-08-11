"""Tests for app/schemas/topic.py."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.topic import (
    TopicCreate,
    TopicDetailResponse,
    TopicResponse,
    TopicUpdate,
)


def test_topic_detail_response_supports_nested_subtopics():
    child = TopicDetailResponse(
        id=2,
        name="Child",
        code="CHILD",
        section="math",
        parent_topic_id=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        subtopics=[],
    )
    parent = TopicDetailResponse(
        id=1,
        name="Parent",
        code="PARENT",
        section="math",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        subtopics=[child],
    )

    assert parent.subtopics[0].code == "CHILD"


def test_topic_detail_response_defaults_subtopics_to_empty_list():
    topic = TopicDetailResponse(
        id=1,
        name="Leaf",
        code="LEAF",
        section="math",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    assert topic.subtopics == []


def test_topic_create_requires_section():
    with pytest.raises(ValidationError):
        TopicCreate(name="Algebra", code="ALGEBRA")


def test_topic_create_accepts_section():
    topic = TopicCreate(name="Algebra", code="ALGEBRA", section="math")

    assert topic.section == "math"


def test_topic_update_section_is_optional():
    update = TopicUpdate()

    assert update.section is None


def test_topic_response_tolerates_missing_section_for_legacy_rows():
    """A pre-existing topic with no linked question has no derivable
    section and stays NULL at the DB level (see the backfill migration) --
    the response schema must still serialize it instead of failing
    validation."""
    topic = TopicResponse(
        id=1,
        name="Legacy Topic",
        code="LEGACY",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    assert topic.section is None
