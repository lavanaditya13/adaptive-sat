"""Integration regression tests for the practice -> scoring -> recommendation
pipeline described in CLAUDE.md: a student answers questions in a
PracticeSession, submit_answer() writes Attempt rows, skill_scoring_service
aggregates those into per-topic accuracy, and completing a session triggers
recommendation_service to turn the weakest topics into a StudyPlan.

Unlike the rest of app/tests/ (which mock the db entirely), these run
against a real Postgres database via SessionLocal so a change to any one of
practice_service / skill_scoring_service / recommendation_service that
breaks how it reads or writes shared state is actually caught. See
conftest.py for how the test database is provisioned; these tests skip
cleanly if Postgres isn't reachable.

Deliberately kept under tests/integration/ rather than tests/services/ —
splitting it per-service would defeat its purpose, which is exercising the
seam *between* services, not any one of them in isolation. Single-service
behavior belongs in the matching tests/services/test_*.py file instead.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.practice_session_question import PracticeSessionQuestion
from app.models.question import Question
from app.models.study_plan import StudyPlan
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import PracticeStartRequest, SubmitAnswerRequest
from app.services import practice_service, skill_scoring_service

MATH_SECTION_ID = 1
WEAK_TOPIC_CODE = "REGR_WEAK_TOPIC"
STRONG_TOPIC_CODE = "REGR_STRONG_TOPIC"
CORRECT_ANSWER = "A"
WRONG_ANSWER = "B"
CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


@asynccontextmanager
async def _request_scoped_session():
    """Mirrors app.core.database.get_db's commit-on-success behavior.

    These tests call service functions directly instead of going through a
    FastAPI request, so they don't get get_db's implicit commit-after-yield
    for free -- some service functions (e.g. set_selected_section) rely on
    it and only flush, not commit, since in production the request's get_db
    always commits after the endpoint returns.
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def _get_or_create_topic(session, code: str, name: str) -> Topic:
    topic = await session.scalar(select(Topic).where(Topic.code == code))
    if topic is None:
        topic = Topic(code=code, name=name)
        session.add(topic)
        await session.flush()
    return topic


async def _get_or_create_question(session, prompt: str, topic_id: int) -> Question:
    question = await session.scalar(select(Question).where(Question.prompt == prompt))
    if question is None:
        question = Question(
            section="math",
            prompt=prompt,
            choices=CHOICES,
            correct_answer=CORRECT_ANSWER,
            difficulty="easy",
            topic_id=topic_id,
        )
        session.add(question)
        await session.flush()
    return question


@pytest_asyncio.fixture
async def seeded_questions(_reset_student_state: None) -> dict:
    """Two topics x two questions each, in the math section, all sharing the
    same correct answer ("A") so tests can control per-topic accuracy just
    by choosing which prompts to answer wrong.
    """
    async with SessionLocal() as session:
        weak_topic = await _get_or_create_topic(session, WEAK_TOPIC_CODE, "Regression Weak Topic")
        strong_topic = await _get_or_create_topic(session, STRONG_TOPIC_CODE, "Regression Strong Topic")
        await session.commit()

        weak_q1 = await _get_or_create_question(session, "Regression Weak Q1", weak_topic.id)
        weak_q2 = await _get_or_create_question(session, "Regression Weak Q2", weak_topic.id)
        strong_q1 = await _get_or_create_question(session, "Regression Strong Q1", strong_topic.id)
        strong_q2 = await _get_or_create_question(session, "Regression Strong Q2", strong_topic.id)
        await session.commit()

        return {
            "weak_topic_id": weak_topic.id,
            "strong_topic_id": strong_topic.id,
            "weak_prompts": {weak_q1.prompt, weak_q2.prompt},
            "strong_prompts": {strong_q1.prompt, strong_q2.prompt},
        }


async def _select_math_section(student: User) -> None:
    async with _request_scoped_session() as db:
        await practice_service.set_selected_section(db, student, section_id=MATH_SECTION_ID)


async def _run_full_section_session(student: User, wrong_prompts: frozenset[str] = frozenset()):
    """Start a section-mode session, answer every question (deliberately
    wrong for prompts in `wrong_prompts`, correct otherwise), and complete
    it. Returns the PracticeCompleteResponse.
    """
    async with _request_scoped_session() as db:
        start_response = await practice_service.start_practice_session(
            db,
            PracticeStartRequest(mode="section", question_count=4),
            student,
        )

    for _ in range(start_response.total_questions):
        async with _request_scoped_session() as db:
            current = await practice_service.get_current_question(db, student)
            selected = WRONG_ANSWER if current.question.prompt in wrong_prompts else CORRECT_ANSWER
            await practice_service.submit_answer(
                db,
                student,
                SubmitAnswerRequest(selected_answer=selected, time_spent_seconds=30, confidence_level=3),
            )

    async with _request_scoped_session() as db:
        return await practice_service.complete_practice_session(db, student)


@pytest.mark.asyncio
async def test_start_section_session_creates_expected_rows(student, seeded_questions):
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        response = await practice_service.start_practice_session(
            db,
            PracticeStartRequest(mode="section", question_count=4),
            student,
        )

    assert response.status == "in_progress"
    assert response.total_questions == 4
    assert response.question is not None

    async with SessionLocal() as db:
        sessions = (
            await db.execute(select(PracticeSession).where(PracticeSession.student_id == student.id))
        ).scalars().all()
        assert len(sessions) == 1
        assert sessions[0].mode == "section"
        assert sessions[0].status == "in_progress"

        session_questions = (
            await db.execute(
                select(PracticeSessionQuestion).where(
                    PracticeSessionQuestion.practice_session_id == sessions[0].id
                )
            )
        ).scalars().all()
        assert len(session_questions) == 4
        assert {sq.status for sq in session_questions} == {"assigned"}
        assert sorted(sq.position for sq in session_questions) == [1, 2, 3, 4]


@pytest.mark.asyncio
async def test_cannot_start_second_session_while_one_active(student, seeded_questions):
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )

    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.start_practice_session(
                db, PracticeStartRequest(mode="section", question_count=4), student
            )
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_submit_answer_records_attempt_and_advances(student, seeded_questions):
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )

    async with _request_scoped_session() as db:
        submit_response = await practice_service.submit_answer(
            db,
            student,
            SubmitAnswerRequest(selected_answer=WRONG_ANSWER, time_spent_seconds=15, confidence_level=2),
        )
    assert submit_response.saved is True
    assert submit_response.answered_position == 1
    assert submit_response.remaining_questions == 3

    async with SessionLocal() as db:
        attempts = (
            await db.execute(select(Attempt).where(Attempt.student_id == student.id))
        ).scalars().all()
        assert len(attempts) == 1
        assert attempts[0].selected_answer == WRONG_ANSWER
        assert attempts[0].is_correct is False

        answered = (
            await db.execute(
                select(PracticeSessionQuestion).where(PracticeSessionQuestion.position == 1)
            )
        ).scalar_one()
        assert answered.status == "answered"
        assert answered.answered_at is not None


@pytest.mark.asyncio
async def test_cannot_complete_session_with_no_answers(student, seeded_questions):
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )

    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.complete_practice_session(db, student)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_complete_session_generates_study_plan_from_weakest_topics(student, seeded_questions):
    await _select_math_section(student)

    complete_response = await _run_full_section_session(
        student, wrong_prompts=frozenset(seeded_questions["weak_prompts"])
    )

    assert complete_response.status == "completed"
    assert complete_response.score.total == 4
    assert complete_response.score.correct == 2
    assert complete_response.score.incorrect == 2

    async with SessionLocal() as db:
        progress = await skill_scoring_service.get_student_progress(db, student.id)

    weakest = progress["weakest_topics"]
    assert weakest[0]["topic_id"] == seeded_questions["weak_topic_id"]
    assert weakest[0]["accuracy"] == 0.0

    strong_entry = next(
        t for t in progress["performance_by_topic"] if t["topic_id"] == seeded_questions["strong_topic_id"]
    )
    assert strong_entry["accuracy"] == 1.0

    async with SessionLocal() as db:
        plans = (
            await db.execute(select(StudyPlan).where(StudyPlan.student_id == student.id))
        ).scalars().all()
    assert len(plans) == 1
    assert plans[0].status == "active"

    weak_item = next(item for item in plans[0].items if item["topic_id"] == seeded_questions["weak_topic_id"])
    assert weak_item["priority"] == "high"
    assert weak_item["recommended_questions"] == 20


@pytest.mark.asyncio
async def test_adaptive_unlock_after_three_completed_section_sessions(student, seeded_questions):
    await _select_math_section(student)

    for completed_so_far in range(3):
        complete_response = await _run_full_section_session(student)
        assert complete_response.adaptive_unlock is not None
        assert complete_response.adaptive_unlock.completed_sessions == completed_so_far + 1
        assert complete_response.adaptive_unlock.is_unlocked == (completed_so_far + 1 >= 3)

    async with _request_scoped_session() as db:
        selection = await practice_service.set_selected_section(db, student, section_id=MATH_SECTION_ID)

    adaptive_option = next(option for option in selection.practice_options if option.mode == "adaptive")
    assert adaptive_option.is_locked is False
    assert adaptive_option.unlock_requirement is None
