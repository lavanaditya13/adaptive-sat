"""Tests for app/services/recommendation_service.py."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.study_plan import StudyPlan
from app.models.topic import Topic
from app.services.recommendation_service import (
    generate_study_plan_for_student,
    get_or_create_study_plan_for_student,
)

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


@pytest.mark.asyncio
async def test_generate_study_plan_ranks_by_mastery_score_not_raw_accuracy(student, cleanup_after):
    """Regression test for the mastery_score switch: a topic with exactly
    50% raw accuracy (one correct attempt, then one wrong one) would have
    landed in the old accuracy branching's "medium" bucket (0.5 is not
    < 0.5). The BKT estimate weighs the more recent wrong answer more
    heavily than a flat average does, so mastery_score for this same
    sequence lands under 0.5 -- this must come out "high", proving the
    ranking key actually changed rather than just the reason string.
    """
    async with SessionLocal() as db:
        topic = Topic(code=f"RECS_MASTERY_{uuid.uuid4().hex[:8]}", name="Recs Mastery Topic")
        db.add(topic)
        await db.flush()
        cleanup_after.append((Topic, topic.id))

        question_one = Question(
            section="math", prompt=f"Recs Mastery Q1 {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=topic.id,
        )
        question_two = Question(
            section="math", prompt=f"Recs Mastery Q2 {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=topic.id,
        )
        db.add_all([question_one, question_two])
        await db.flush()

        session = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=2
        )
        db.add(session)
        await db.flush()

        now = datetime.now(timezone.utc)

        db.add(
            Attempt(
                practice_session_id=session.id,
                student_id=student.id,
                question_id=question_one.id,
                topic_id=topic.id,
                selected_answer="A",
                correct_answer="A",
                is_correct=True,
                created_at=now - timedelta(minutes=2),
            )
        )
        db.add(
            Attempt(
                practice_session_id=session.id,
                student_id=student.id,
                question_id=question_two.id,
                topic_id=topic.id,
                selected_answer="B",
                correct_answer="A",
                is_correct=False,
                created_at=now - timedelta(minutes=1),
            )
        )
        await db.commit()

    async with SessionLocal() as db:
        plan = await generate_study_plan_for_student(db=db, student_id=student.id)

    item = next(item for item in plan.items if item["topic_id"] == topic.id)
    assert item["priority"] == "high"
    assert "Mastery score" in item["reason"]
    assert "Accuracy" not in item["reason"]


@pytest.mark.asyncio
async def test_get_or_create_returns_existing_active_plan_without_generating_a_new_one(student):
    # No cleanup_after needed -- study_plans is truncated per-test by
    # _reset_student_state (via the `student` fixture), unlike Topic/Question
    # which persist across tests deliberately (see cleanup_after's docstring).
    async with SessionLocal() as db:
        existing = StudyPlan(
            student_id=student.id, title="Existing Plan", status="active", items=[]
        )
        db.add(existing)
        await db.commit()
        await db.refresh(existing)

    async with SessionLocal() as db:
        plan = await get_or_create_study_plan_for_student(db=db, student_id=student.id)

    assert plan.id == existing.id
    assert plan.title == "Existing Plan"


@pytest.mark.asyncio
async def test_get_or_create_generates_a_plan_when_student_has_none(student):
    async with SessionLocal() as db:
        plan = await get_or_create_study_plan_for_student(db=db, student_id=student.id)

    assert plan.student_id == student.id
    assert plan.status == "active"
    assert plan.id is not None


@pytest.mark.asyncio
async def test_get_or_create_ignores_archived_plans_and_generates_a_new_one(student):
    async with SessionLocal() as db:
        archived = StudyPlan(
            student_id=student.id, title="Archived Plan", status="archived", items=[]
        )
        db.add(archived)
        await db.commit()
        await db.refresh(archived)

    async with SessionLocal() as db:
        plan = await get_or_create_study_plan_for_student(db=db, student_id=student.id)

    assert plan.id != archived.id
    assert plan.status == "active"
