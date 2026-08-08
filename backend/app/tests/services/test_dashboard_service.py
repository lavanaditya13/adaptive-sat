"""Tests for app/services/dashboard_service.py."""

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.section import Section
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import UpdateTargetScoreRequest
from app.services.dashboard_service import get_student_dashboard, update_target_score

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


async def _get_or_create_section(db, name: str, display_name: str) -> Section:
    section = await db.scalar(select(Section).where(Section.name == name))
    if section is None:
        section = Section(name=name, display_name=display_name)
        db.add(section)
        await db.flush()
    return section


@pytest.mark.asyncio
async def test_get_student_dashboard_rejects_non_student_role(student):
    async with SessionLocal() as db:
        student.role = "tutor"
        db.add(student)
        await db.commit()

    async with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc_info:
            await get_student_dashboard(db=db, student_id=student.id)

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_student_dashboard_with_no_activity_returns_zeroed_progress(student):
    async with SessionLocal() as db:
        await _get_or_create_section(db, "math", "Math")
        await db.commit()

    async with SessionLocal() as db:
        dashboard = await get_student_dashboard(db=db, student_id=student.id)

    assert dashboard.progress.sessions_completed == 0
    assert dashboard.progress.questions_answered == 0
    assert dashboard.progress.accuracy_percentage == 0.0


@pytest.mark.asyncio
async def test_get_student_dashboard_counts_completed_sessions_and_accuracy(student, cleanup_after):
    async with SessionLocal() as db:
        await _get_or_create_section(db, "math", "Math")
        topic = Topic(code=f"DASH_TOPIC_{uuid.uuid4().hex[:8]}", name="Dashboard Topic")
        db.add(topic)
        await db.flush()
        cleanup_after.append((Topic, topic.id))

        question = Question(
            section="math", prompt=f"Dashboard Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=topic.id,
        )
        db.add(question)
        await db.flush()

        session = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=1
        )
        db.add(session)
        await db.flush()

        db.add(
            Attempt(
                practice_session_id=session.id,
                student_id=student.id,
                question_id=question.id,
                topic_id=topic.id,
                selected_answer="A",
                correct_answer="A",
                is_correct=True,
                time_spent_seconds=60,
            )
        )
        await db.commit()

    async with SessionLocal() as db:
        dashboard = await get_student_dashboard(db=db, student_id=student.id)

    assert dashboard.progress.sessions_completed == 1
    assert dashboard.progress.questions_answered == 1
    assert dashboard.progress.accuracy_percentage == 100.0


@pytest.mark.asyncio
async def test_update_target_score_persists_and_returns_estimate(student):
    async with SessionLocal() as db:
        response = await update_target_score(
            db=db, student=student, request=UpdateTargetScoreRequest(target_score=1400)
        )

    assert response.target_score == 1400

    async with SessionLocal() as db:
        refetched = await db.get(User, student.id)

    assert refetched.target_score == 1400
