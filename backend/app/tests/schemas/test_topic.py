"""Tests for app/schemas/topic.py."""

from datetime import datetime, timezone

from app.schemas.topic import TopicDetailResponse


def test_topic_detail_response_supports_nested_subtopics():
    child = TopicDetailResponse(
        id=2,
        name="Child",
        code="CHILD",
        parent_topic_id=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        subtopics=[],
    )
    parent = TopicDetailResponse(
        id=1,
        name="Parent",
        code="PARENT",
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
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    assert topic.subtopics == []
