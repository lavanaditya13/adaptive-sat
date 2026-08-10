"""Tests for app/repositories/practice_session.py.

get_active_session_for_student is the single source of truth for the
"active session" predicate (see app/core/constants.py's
ACTIVE_PRACTICE_SESSION_STATUSES) -- practice_service calls this rather than
re-implementing the query, so this file is what actually pins that
predicate's behavior down.
"""

import pytest

from app.core.database import SessionLocal
from app.models.practice_session import PracticeSession
from app.repositories.practice_session import practice_session_repository


@pytest.mark.asyncio
async def test_returns_none_when_no_sessions_exist(student):
    async with SessionLocal() as db:
        result = await practice_session_repository.get_active_session_for_student(db, student.id)

    assert result is None


@pytest.mark.parametrize("active_status", ["in_progress", "ready_to_complete"])
@pytest.mark.asyncio
async def test_returns_session_in_active_statuses(student, active_status):
    async with SessionLocal() as db:
        session = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status=active_status, question_count=5
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    async with SessionLocal() as db:
        result = await practice_session_repository.get_active_session_for_student(db, student.id)

    assert result is not None
    assert result.id == session.id


@pytest.mark.parametrize("inactive_status", ["completed", "abandoned"])
@pytest.mark.asyncio
async def test_does_not_return_session_in_inactive_statuses(student, inactive_status):
    async with SessionLocal() as db:
        session = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status=inactive_status, question_count=5
        )
        db.add(session)
        await db.commit()

    async with SessionLocal() as db:
        result = await practice_session_repository.get_active_session_for_student(db, student.id)

    assert result is None


@pytest.mark.asyncio
async def test_get_by_student_returns_sessions_regardless_of_status(student):
    async with SessionLocal() as db:
        completed = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="completed", question_count=5
        )
        abandoned = PracticeSession(
            student_id=student.id, section_id=1, mode="section", status="abandoned", question_count=5
        )
        db.add_all([completed, abandoned])
        await db.commit()

    async with SessionLocal() as db:
        results = await practice_session_repository.get_by_student(db, student_id=student.id)

    assert {s.id for s in results} == {completed.id, abandoned.id}
