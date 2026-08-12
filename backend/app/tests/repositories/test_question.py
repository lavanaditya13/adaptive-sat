"""Tests for app/repositories/question.py."""

import uuid

import pytest

from app.core.database import SessionLocal
from app.models.question import Question
from app.models.topic import Topic
from app.repositories.question import question_repository

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


async def _make_topic(db) -> Topic:
    topic = Topic(code=f"Q_REPO_TOPIC_{uuid.uuid4().hex[:8]}", name="Question Repo Topic")
    db.add(topic)
    await db.flush()
    return topic


@pytest.mark.asyncio
async def test_get_by_difficulty_filters_correctly(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        topic = await _make_topic(db)
        cleanup_after.append((Topic, topic.id))
        easy = Question(
            section="math",
            prompt=f"Easy Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="easy",
            topic_id=topic.id,
        )
        hard = Question(
            section="math",
            prompt=f"Hard Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="hard",
            topic_id=topic.id,
        )
        db.add_all([easy, hard])
        await db.commit()

    async with SessionLocal() as db:
        easy_results = await question_repository.get_by_difficulty(db, difficulty="easy", limit=100)

    easy_ids = {q.id for q in easy_results}
    assert easy.id in easy_ids
    assert hard.id not in easy_ids


@pytest.mark.asyncio
async def test_get_by_topic_returns_only_that_topics_questions(_skip_without_postgres, cleanup_after):
    async with SessionLocal() as db:
        topic_a = await _make_topic(db)
        topic_b = await _make_topic(db)
        cleanup_after.append((Topic, topic_a.id))
        cleanup_after.append((Topic, topic_b.id))
        q_a = Question(
            section="math",
            prompt=f"Topic A Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="medium",
            topic_id=topic_a.id,
        )
        q_b = Question(
            section="math",
            prompt=f"Topic B Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="medium",
            topic_id=topic_b.id,
        )
        db.add_all([q_a, q_b])
        await db.commit()

    async with SessionLocal() as db:
        results = await question_repository.get_by_topic(db, topic_id=topic_a.id, limit=100)

    result_ids = {q.id for q in results}
    assert q_a.id in result_ids
    assert q_b.id not in result_ids
