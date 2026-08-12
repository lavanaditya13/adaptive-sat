"""Tests for app/services/recommendation_service.py."""

import uuid

import pytest

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.topic import Topic
from app.services.recommendation_service import generate_study_plan_for_student

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


@pytest.mark.asyncio
async def test_generate_study_plan_with_no_attempts_falls_back_to_mixed_practice(student):
    async with SessionLocal() as db:
        plan = await generate_study_plan_for_student(db=db, student_id=student.id)

    assert plan.student_id == student.id
    assert plan.status == "active"
    assert len(plan.items) == 1
    assert plan.items[0]["topic_id"] is None
    assert plan.items[0]["topic_name"] == "Mixed Practice"


@pytest.mark.asyncio
async def test_generate_study_plan_prioritizes_weak_topics(student, cleanup_after):
    async with SessionLocal() as db:
        weak_topic = Topic(code=f"RECS_WEAK_{uuid.uuid4().hex[:8]}", name="Recs Weak Topic")
        db.add(weak_topic)
        await db.flush()
        cleanup_after.append((Topic, weak_topic.id))

        # Two distinct questions -- attempts(practice_session_id, question_id)
        # is unique (see alembic/versions/b563f85526f2_*.py), so two wrong
        # attempts for the same topic need two different questions, not two
        # Attempt rows against the same one.
        question_one = Question(
            section="math", prompt=f"Recs Weak Q1 {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=weak_topic.id,
        )
        question_two = Question(
            section="math", prompt=f"Recs Weak Q2 {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=weak_topic.id,
        )
        db.add_all([question_one, question_two])
        await db.flush()

        session = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=2
        )
        db.add(session)
        await db.flush()

        # Two wrong attempts -> 0% accuracy for this topic -> "high" priority.
        for question in (question_one, question_two):
            db.add(
                Attempt(
                    practice_session_id=session.id,
                    student_id=student.id,
                    question_id=question.id,
                    topic_id=weak_topic.id,
                    selected_answer="B",
                    correct_answer="A",
                    is_correct=False,
                )
            )
        await db.commit()

    async with SessionLocal() as db:
        plan = await generate_study_plan_for_student(db=db, student_id=student.id)

    assert any(item["topic_id"] == weak_topic.id and item["priority"] == "high" for item in plan.items)
