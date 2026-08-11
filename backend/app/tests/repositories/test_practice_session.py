"""Tests for app/repositories/practice_session.py.

get_active_session_for_student is the single source of truth for the
"active session" predicate (see app/core/constants.py's
ACTIVE_PRACTICE_SESSION_STATUSES) -- practice_service calls this rather than
re-implementing the query, so this file is what actually pins that
predicate's behavior down.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, StatementError

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


@pytest.mark.parametrize("inactive_status", ["completed", "abandoned", "expired"])
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


@pytest.mark.asyncio
async def test_invalid_status_rejected_by_orm(student):
    """PracticeSession.status is typed with PracticeSessionStatus (see
    app/models/practice_session.py) -- a value outside that enum should
    never reach the database in the first place.

    IntegrityError is itself a StatementError subclass, so asserting only
    `pytest.raises(StatementError)` here would pass even if the model's
    enum typing were dropped entirely and the invalid value fell through to
    the DB, where the CHECK constraint (covered separately below) would
    catch it instead -- that's a materially different failure this test
    would then be silently blind to. Asserting the `.orig` is a plain
    LookupError, not a DBAPI error, pins this test to rejection at the
    Python/ORM layer specifically, before any round trip to the database.
    """
    async with SessionLocal() as db:
        db.add(
            PracticeSession(
                student_id=student.id,
                section_id=1,
                mode="section",
                status="not_a_real_status",
                question_count=5,
            )
        )
        with pytest.raises(StatementError) as exc_info:
            await db.flush()

    assert isinstance(exc_info.value.orig, LookupError)
    assert not isinstance(exc_info.value, IntegrityError)


@pytest.mark.asyncio
async def test_invalid_status_rejected_by_check_constraint(student):
    """Belt-and-suspenders backstop for test_invalid_status_rejected_by_orm:
    even a raw SQL write that bypasses the ORM's enum validation entirely
    must still be rejected, by the CHECK constraint added in alembic
    revision f3a7c1e9d5b2 (ck_practice_sessions_status). Confirms the
    constraint actually exists and enforces the same value set, not just
    that the ORM type happens to agree with it.
    """
    async with SessionLocal() as db:
        with pytest.raises(IntegrityError):
            await db.execute(
                text(
                    "INSERT INTO practice_sessions "
                    "(student_id, section_id, mode, status, question_count) "
                    "VALUES (:student_id, 1, 'section', 'not_a_real_status', 5)"
                ),
                {"student_id": student.id},
            )
