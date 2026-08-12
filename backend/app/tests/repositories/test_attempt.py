"""Tests for app/repositories/attempt.py."""

import uuid

import pytest

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.topic import Topic
from app.repositories.attempt import attempt_repository

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


@pytest.mark.asyncio
async def test_get_attempts_by_session_scopes_to_that_session(student, cleanup_after):
    async with SessionLocal() as db:
        topic = Topic(code=f"ATTEMPT_REPO_TOPIC_{uuid.uuid4().hex[:8]}", name="Attempt Repo Topic")
        db.add(topic)
        await db.flush()
        cleanup_after.append((Topic, topic.id))

        question = Question(
            section="math",
            prompt=f"Attempt Repo Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="easy",
            topic_id=topic.id,
        )
        db.add(question)
        await db.flush()

        session_one = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=1
        )
        session_two = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=1
        )
        db.add_all([session_one, session_two])
        await db.flush()

        attempt_one = Attempt(
            practice_session_id=session_one.id,
            student_id=student.id,
            question_id=question.id,
            topic_id=topic.id,
            selected_answer="A",
            correct_answer="A",
            is_correct=True,
        )
        attempt_two = Attempt(
            practice_session_id=session_two.id,
            student_id=student.id,
            question_id=question.id,
            topic_id=topic.id,
            selected_answer="B",
            correct_answer="A",
            is_correct=False,
        )
        db.add_all([attempt_one, attempt_two])
        await db.commit()

    async with SessionLocal() as db:
        results = await attempt_repository.get_attempts_by_session(db, session_id=session_one.id)

    assert len(results) == 1
    assert results[0].id == attempt_one.id
