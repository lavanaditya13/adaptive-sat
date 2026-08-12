"""Tests for app/repositories/practice_session.py.

get_active_session_for_student is the single source of truth for the
"active session" predicate (see app/core/constants.py's
ACTIVE_PRACTICE_SESSION_STATUSES) -- practice_service calls this rather than
re-implementing the query, so this file is what actually pins that
predicate's behavior down.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, StatementError

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.repositories.practice_session import practice_session_repository

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


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


# --- expire_stale_sessions ---------------------------------------------------
# Backs practice_service.expire_stale_practice_sessions, the reaper for
# sessions whose student never comes back at all (see that function's
# docstring). Cutoff is passed in explicitly by the caller rather than
# computed here, so these tests control it directly instead of depending on
# settings.PRACTICE_SESSION_EXPIRE_HOURS.


@pytest.mark.parametrize("active_status", ["in_progress", "ready_to_complete"])
@pytest.mark.asyncio
async def test_expire_stale_sessions_expires_active_session_past_cutoff(student, active_status):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        session = PracticeSession(
            student_id=student.id,
            section_id=1,
            mode="section",
            status=active_status,
            question_count=5,
            created_at=cutoff - timedelta(hours=1),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    async with SessionLocal() as db:
        expired_count = await practice_session_repository.expire_stale_sessions(db, cutoff=cutoff)
        await db.commit()

    assert expired_count == 1

    async with SessionLocal() as db:
        refreshed = await db.get(PracticeSession, session.id)

    assert refreshed.status == "expired"


@pytest.mark.asyncio
async def test_expire_stale_sessions_leaves_recent_session_alone(student):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        session = PracticeSession(
            student_id=student.id,
            section_id=1,
            mode="section",
            status="in_progress",
            question_count=5,
            created_at=cutoff + timedelta(hours=1),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    async with SessionLocal() as db:
        expired_count = await practice_session_repository.expire_stale_sessions(db, cutoff=cutoff)
        await db.commit()

    assert expired_count == 0

    async with SessionLocal() as db:
        refreshed = await db.get(PracticeSession, session.id)

    assert refreshed.status == "in_progress"


@pytest.mark.parametrize("inactive_status", ["completed", "abandoned", "expired"])
@pytest.mark.asyncio
async def test_expire_stale_sessions_ignores_inactive_statuses(student, inactive_status):
    """A session already outside ACTIVE_PRACTICE_SESSION_STATUSES is left
    alone even if it's ancient -- there's nothing to expire, and re-stamping
    e.g. a completed session as expired would corrupt real history."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        session = PracticeSession(
            student_id=student.id,
            section_id=1,
            mode="section",
            status=inactive_status,
            question_count=5,
            created_at=cutoff - timedelta(days=30),
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    async with SessionLocal() as db:
        expired_count = await practice_session_repository.expire_stale_sessions(db, cutoff=cutoff)
        await db.commit()

    assert expired_count == 0

    async with SessionLocal() as db:
        refreshed = await db.get(PracticeSession, session.id)

    assert refreshed.status == inactive_status


@pytest.mark.asyncio
async def test_expire_stale_sessions_uses_latest_attempt_not_creation_time(student, cleanup_after):
    """Mirrors practice_service._is_session_stale's activity signal: a
    session created long ago but answered recently is still active, not
    stale -- last attempt wins over created_at when both exist."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        topic = Topic(code=f"REAPER_TOPIC_{uuid.uuid4().hex[:8]}", name="Reaper Topic")
        db.add(topic)
        await db.flush()
        cleanup_after.append((Topic, topic.id))

        question = Question(
            section="math",
            prompt=f"Reaper Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES,
            correct_answer="A",
            difficulty="easy",
            topic_id=topic.id,
        )
        db.add(question)
        await db.flush()

        session = PracticeSession(
            student_id=student.id,
            section_id=1,
            mode="section",
            status="in_progress",
            question_count=5,
            created_at=cutoff - timedelta(days=10),
        )
        db.add(session)
        await db.flush()

        recent_attempt = Attempt(
            practice_session_id=session.id,
            student_id=student.id,
            question_id=question.id,
            topic_id=topic.id,
            selected_answer="A",
            correct_answer="A",
            is_correct=True,
            created_at=cutoff + timedelta(hours=1),
        )
        db.add(recent_attempt)
        await db.commit()

    async with SessionLocal() as db:
        expired_count = await practice_session_repository.expire_stale_sessions(db, cutoff=cutoff)
        await db.commit()

    assert expired_count == 0

    async with SessionLocal() as db:
        refreshed = await db.get(PracticeSession, session.id)

    assert refreshed.status == "in_progress"


@pytest.mark.asyncio
async def test_expire_stale_sessions_counts_multiple_students(student, cleanup_after):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with SessionLocal() as db:
        other_student = User(
            email=f"reaper-other-{uuid.uuid4().hex}@example.com",
            full_name="Other Student",
            role="student",
            is_active=True,
        )
        db.add(other_student)
        await db.flush()
        cleanup_after.append((User, other_student.id))

        session_one = PracticeSession(
            student_id=student.id,
            section_id=1,
            mode="section",
            status="in_progress",
            question_count=5,
            created_at=cutoff - timedelta(hours=1),
        )
        session_two = PracticeSession(
            student_id=other_student.id,
            section_id=1,
            mode="section",
            status="ready_to_complete",
            question_count=5,
            created_at=cutoff - timedelta(hours=2),
        )
        db.add_all([session_one, session_two])
        await db.commit()

    async with SessionLocal() as db:
        expired_count = await practice_session_repository.expire_stale_sessions(db, cutoff=cutoff)
        await db.commit()

    assert expired_count == 2
