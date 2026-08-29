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

import asyncio
import uuid
from contextlib import asynccontextmanager

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select

from app.core.constants import IdempotentEndpoint
from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.practice_session_question import PracticeSessionQuestion
from app.models.question import Question
from app.models.study_plan import StudyPlan
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import (
    PracticeStartRequest,
    PracticeStartResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services import practice_service, skill_scoring_service
from app.services.idempotency_service import compute_request_fingerprint, run_idempotent
from app.services.recommendation_service import get_or_create_study_plan_for_student

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
async def test_get_study_plan_reads_back_the_plan_session_completion_wrote(student, seeded_questions):
    """Closes the "StudyPlan is write-only" gap: completing a session writes
    a StudyPlan as a side effect (see the test above), but until GET
    /api/v1/study-plan existed there was no way to read one back. This
    proves get_or_create_study_plan_for_student (the endpoint's service
    call) returns that exact same row rather than silently generating a
    second, duplicate plan on every read.
    """
    await _select_math_section(student)

    await _run_full_section_session(
        student, wrong_prompts=frozenset(seeded_questions["weak_prompts"])
    )

    async with SessionLocal() as db:
        written_plan = (
            await db.execute(select(StudyPlan).where(StudyPlan.student_id == student.id))
        ).scalar_one()

    async with SessionLocal() as db:
        read_plan = await get_or_create_study_plan_for_student(db=db, student_id=student.id)

    assert read_plan.id == written_plan.id

    async with SessionLocal() as db:
        plans_after_read = (
            await db.execute(select(StudyPlan).where(StudyPlan.student_id == student.id))
        ).scalars().all()
    assert len(plans_after_read) == 1


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


@pytest.mark.asyncio
async def test_adaptive_mode_requires_a_selected_section(student, seeded_questions):
    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.start_practice_session(
                db, PracticeStartRequest(mode="adaptive", question_count=2), student,
            )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_adaptive_mode_is_blocked_before_the_unlock_gate_clears(student, seeded_questions):
    """set_selected_section's is_locked flag is display-only -- the adaptive
    branch of start_practice_session has to enforce the gate itself, or a
    direct API call bypasses it entirely regardless of what the UI shows."""
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.start_practice_session(
                db, PracticeStartRequest(mode="adaptive", question_count=2), student,
            )

    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_adaptive_mode_only_pulls_questions_from_the_selected_section(
    student, seeded_questions, cleanup_after
):
    """get_weakest_skills is scoped by section_code -- a topic the student
    is weak in belonging to a DIFFERENT section must never influence (or
    appear as a question source in) this section's adaptive session.
    Regression coverage for the "adaptive read progress globally, not
    scoped to the selected section" gap.
    """
    async with SessionLocal() as db:
        rw_topic = Topic(
            code=f"ADAPTIVE_RW_{uuid.uuid4().hex[:8]}",
            name=f"Adaptive RW Weak Topic {uuid.uuid4().hex[:8]}",
        )
        db.add(rw_topic)
        await db.flush()
        cleanup_after.append((Topic, rw_topic.id))

        rw_question = Question(
            section="reading_writing", prompt=f"Adaptive RW Weak Q {uuid.uuid4().hex[:8]}",
            choices=CHOICES, correct_answer=CORRECT_ANSWER, difficulty="medium",
            topic_id=rw_topic.id,
        )
        db.add(rw_question)
        await db.flush()

        rw_session = PracticeSession(
            student_id=student.id, section_id=2, mode="section",
            status="completed", question_count=1,
        )
        db.add(rw_session)
        await db.flush()
        db.add(
            Attempt(
                practice_session_id=rw_session.id, student_id=student.id,
                question_id=rw_question.id, topic_id=rw_topic.id,
                selected_answer=WRONG_ANSWER, correct_answer=CORRECT_ANSWER, is_correct=False,
            )
        )
        await db.commit()

    await _select_math_section(student)

    for _ in range(3):
        await _run_full_section_session(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="adaptive", question_count=2), student,
        )

    async with SessionLocal() as db:
        chosen_sections = (
            await db.execute(
                select(Question.section)
                .join(PracticeSessionQuestion, PracticeSessionQuestion.question_id == Question.id)
                .join(PracticeSession, PracticeSession.id == PracticeSessionQuestion.practice_session_id)
                .where(PracticeSession.student_id == student.id, PracticeSession.mode == "adaptive")
            )
        ).scalars().all()

    assert chosen_sections
    assert all(section == "math" for section in chosen_sections)


@pytest.mark.asyncio
async def test_adaptive_order_expression_skews_selection_toward_the_weaker_topic(
    student, cleanup_after
):
    """Weighted-random selection (practice_service._adaptive_order_expression)
    should draw most of a draw from the weaker of two targets, not
    distribute evenly -- this is what makes "adaptive" mean something
    beyond a plain shuffle.

    Exercises the SQL expression directly against real Postgres (weighted
    sampling only means something under a real random()) with an explicit
    weakest_skills list built from get_weakest_skills' own real output,
    rather than going through start_practice_session end-to-end: Topic/
    Question rows aren't truncated between tests (see conftest), so the
    section's full curriculum can accumulate other tests' untouched
    scratch topics tied at mastery_score 0 -- legitimately "just as weak"
    from get_weakest_skills' point of view, but they'd crowd this test's
    two topics out of a small top-N and make it flaky through the full
    pipeline. Isolating the expression itself keeps this test about the
    weighting mechanism, not the section's incidental curriculum size.
    """
    async with SessionLocal() as db:
        weak_topic = Topic(
            code=f"ADAPTIVE_WEAK_{uuid.uuid4().hex[:8]}",
            name=f"Adaptive Weak Topic {uuid.uuid4().hex[:8]}",
        )
        strong_topic = Topic(
            code=f"ADAPTIVE_STRONG_{uuid.uuid4().hex[:8]}",
            name=f"Adaptive Strong Topic {uuid.uuid4().hex[:8]}",
        )
        db.add_all([weak_topic, strong_topic])
        await db.flush()
        cleanup_after.append((Topic, weak_topic.id))
        cleanup_after.append((Topic, strong_topic.id))

        weak_questions = []
        strong_questions = []
        for i in range(10):
            weak_question = Question(
                section="math", prompt=f"Adaptive Weak Q{i} {uuid.uuid4().hex[:8]}",
                choices=CHOICES, correct_answer=CORRECT_ANSWER, difficulty="medium",
                topic_id=weak_topic.id,
            )
            strong_question = Question(
                section="math", prompt=f"Adaptive Strong Q{i} {uuid.uuid4().hex[:8]}",
                choices=CHOICES, correct_answer=CORRECT_ANSWER, difficulty="medium",
                topic_id=strong_topic.id,
            )
            db.add_all([weak_question, strong_question])
            weak_questions.append(weak_question)
            strong_questions.append(strong_question)
        await db.flush()

        # Mastery gap: one wrong answer on weak_topic, a sustained correct
        # run on strong_topic -- BKT reads these far enough apart that the
        # weight ratio (see _adaptive_order_expression) heavily favors weak.
        weak_session = PracticeSession(
            student_id=student.id, section_id=MATH_SECTION_ID, mode="section",
            status="completed", question_count=1,
        )
        db.add(weak_session)
        await db.flush()
        db.add(
            Attempt(
                practice_session_id=weak_session.id, student_id=student.id,
                question_id=weak_questions[0].id, topic_id=weak_topic.id,
                selected_answer=WRONG_ANSWER, correct_answer=CORRECT_ANSWER, is_correct=False,
            )
        )

        for _ in range(5):
            strong_session = PracticeSession(
                student_id=student.id, section_id=MATH_SECTION_ID, mode="section",
                status="completed", question_count=1,
            )
            db.add(strong_session)
            await db.flush()
            db.add(
                Attempt(
                    practice_session_id=strong_session.id, student_id=student.id,
                    question_id=strong_questions[0].id, topic_id=strong_topic.id,
                    selected_answer=CORRECT_ANSWER, correct_answer=CORRECT_ANSWER, is_correct=True,
                )
            )

        await db.commit()

    async with SessionLocal() as db:
        section_topics = await practice_service._load_section_topic_rows(
            db=db, section_code="math"
        )
        positions_by_topic_id = {
            topic.id: position for position, topic in enumerate(section_topics, start=1)
        }

        ranked = await skill_scoring_service.get_weakest_skills(
            db=db, student_id=student.id, section_code="math", limit=len(section_topics)
        )
        weak_row = next(
            row for row in ranked if row["topic_id"] == positions_by_topic_id[weak_topic.id]
        )
        strong_row = next(
            row for row in ranked if row["topic_id"] == positions_by_topic_id[strong_topic.id]
        )
        assert weak_row["mastery_score"] < strong_row["mastery_score"]

        order_expression = practice_service._adaptive_order_expression(
            [weak_row, strong_row], section_topics
        )

        chosen_topic_ids = (
            await db.execute(
                select(Question.topic_id)
                .where(Question.topic_id.in_([weak_topic.id, strong_topic.id]))
                .order_by(order_expression)
                .limit(10)
            )
        ).scalars().all()

    weak_count = sum(1 for topic_id in chosen_topic_ids if topic_id == weak_topic.id)

    assert len(chosen_topic_ids) == 10
    # Weighted, not guaranteed -- 8/10 leaves a wide, low-flake margin
    # against the large weight gap this fixture sets up.
    assert weak_count >= 8


@pytest.mark.asyncio
async def test_concurrent_submit_answer_does_not_double_count_or_skip(student, seeded_questions):
    """Two overlapping submit_answer calls for the same session (a
    double-clicked "Next", or a retried request) used to both read the same
    next-assigned PracticeSessionQuestion before either wrote back -- see
    practice_service._get_next_assigned_question's for_update lock. Fires
    both concurrently, against real separate connections/transactions, so
    the lock actually has something to serialize.
    """
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=1), student
        )

    async def _submit():
        async with _request_scoped_session() as db:
            return await practice_service.submit_answer(
                db,
                student,
                SubmitAnswerRequest(
                    selected_answer=CORRECT_ANSWER, time_spent_seconds=10, confidence_level=3
                ),
            )

    results = await asyncio.gather(_submit(), _submit(), return_exceptions=True)

    successes = [r for r in results if isinstance(r, practice_service.SubmitAnswerResponse)]
    failures = [r for r in results if isinstance(r, HTTPException)]

    assert len(successes) == 1, f"expected exactly one submission to win the race, got {results}"
    assert len(failures) == 1
    # Blocked by the row lock until the winner commits, the loser re-reads
    # the now-"answered" row, finds no next question, and gets the same 400
    # a legitimate late submit_answer call would -- not a 409 from racing
    # the winner to insert an Attempt (the pre-existing unique-index path).
    assert failures[0].status_code == 400

    async with SessionLocal() as db:
        attempts = (
            await db.execute(select(Attempt).where(Attempt.student_id == student.id))
        ).scalars().all()
        assert len(attempts) == 1  # no double-count

        session_row = (
            await db.execute(select(PracticeSession).where(PracticeSession.student_id == student.id))
        ).scalar_one()
        # The one question got answered, not left stranded "assigned" --
        # and the session correctly advanced instead of getting stuck
        # in_progress with nothing left to answer.
        assert session_row.status == "ready_to_complete"

        session_question = (
            await db.execute(
                select(PracticeSessionQuestion).where(
                    PracticeSessionQuestion.practice_session_id == session_row.id
                )
            )
        ).scalar_one()
        assert session_question.status == "answered"  # no skipped question


async def _start_with_key(student: User, key: str) -> PracticeStartResponse:
    """What the /start endpoint does end-to-end: real start_practice_session
    wrapped by the real run_idempotent, exactly as practice.py wires them --
    not a stand-in for either.
    """
    request = PracticeStartRequest(mode="section", question_count=4)
    async with _request_scoped_session() as db:
        return await run_idempotent(
            db,
            student_id=student.id,
            endpoint=IdempotentEndpoint.PRACTICE_START,
            idempotency_key=key,
            request_fingerprint=compute_request_fingerprint(request),
            response_model=PracticeStartResponse,
            execute=lambda: practice_service.start_practice_session(db, request, student),
        )


@pytest.mark.asyncio
async def test_retried_start_with_same_idempotency_key_returns_original_session_not_a_duplicate(
    student, seeded_questions
):
    """Direct test of this ticket's acceptance criterion for /practice/start:
    a retried request with the same Idempotency-Key gets the original
    result back instead of creating a second PracticeSession.
    """
    await _select_math_section(student)
    key = "start-retry-key"

    first = await _start_with_key(student, key)
    second = await _start_with_key(student, key)

    assert first == second

    async with SessionLocal() as db:
        sessions = (
            await db.execute(select(PracticeSession).where(PracticeSession.student_id == student.id))
        ).scalars().all()
    assert len(sessions) == 1


@pytest.mark.asyncio
async def test_concurrent_start_with_same_idempotency_key_creates_exactly_one_session(
    student, seeded_questions
):
    """The retry-safety property has to hold under real concurrency, not
    just sequential retries -- two /start calls fired together (a
    double-click, or a client retry racing the original that's still in
    flight) with the same key must still produce exactly one session.
    """
    await _select_math_section(student)
    key = "start-concurrent-key"

    results = await asyncio.gather(
        _start_with_key(student, key), _start_with_key(student, key), return_exceptions=True
    )

    successes = [r for r in results if isinstance(r, PracticeStartResponse)]
    failures = [r for r in results if isinstance(r, HTTPException)]

    # Either both calls end up with the same replayed response (if the
    # second ran after the first fully committed), or the second is
    # rejected as still-in-progress (if it raced the first) -- both are
    # safe outcomes. What must never happen is two successes with
    # different session state, or a duplicate row.
    assert len(successes) + len(failures) == 2
    if len(successes) == 2:
        assert successes[0] == successes[1]
    if failures:
        assert failures[0].status_code == 409

    async with SessionLocal() as db:
        sessions = (
            await db.execute(select(PracticeSession).where(PracticeSession.student_id == student.id))
        ).scalars().all()
    assert len(sessions) == 1


@pytest.mark.asyncio
async def test_retried_answer_with_same_idempotency_key_does_not_create_duplicate_attempt(
    student, seeded_questions
):
    """Direct test of this ticket's acceptance criterion for
    /practice/answer: a retried request with the same Idempotency-Key gets
    the original result back instead of recording a second Attempt.
    """
    await _select_math_section(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )

    answer_request = SubmitAnswerRequest(
        selected_answer=CORRECT_ANSWER, time_spent_seconds=10, confidence_level=3
    )
    key = "answer-retry-key"

    async def _answer_with_key() -> SubmitAnswerResponse:
        async with _request_scoped_session() as db:
            return await run_idempotent(
                db,
                student_id=student.id,
                endpoint=IdempotentEndpoint.PRACTICE_ANSWER,
                idempotency_key=key,
                request_fingerprint=compute_request_fingerprint(answer_request),
                response_model=SubmitAnswerResponse,
                execute=lambda: practice_service.submit_answer(db, student, answer_request),
            )

    first = await _answer_with_key()
    second = await _answer_with_key()

    assert first == second

    async with SessionLocal() as db:
        attempts = (
            await db.execute(select(Attempt).where(Attempt.student_id == student.id))
        ).scalars().all()
    assert len(attempts) == 1


# --- GET /practice/results/latest -------------------------------------------
# The Results tab is reachable without having just finished a session (direct
# link, refresh, new device), so its summary has to be re-readable from the
# database rather than only from the client-side store /complete populates.


@pytest.mark.asyncio
async def test_latest_result_reports_no_completed_session_as_404(student, seeded_questions):
    """A student who has never finished a session gets a 404, which the
    Results tab renders as its empty state -- not as an error.
    """
    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.get_latest_session_result(db, student)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_latest_result_matches_the_completion_response_it_re_reads(student, seeded_questions):
    """The core bug this endpoint fixes: after one session, opening Results
    must show that session's score and breakdown, identical to what
    /complete returned in the flow that produced it.
    """
    await _select_math_section(student)

    completed = await _run_full_section_session(
        student, wrong_prompts=frozenset(seeded_questions["weak_prompts"])
    )

    async with _request_scoped_session() as db:
        latest = await practice_service.get_latest_session_result(db, student)

    assert latest.session_id is not None
    assert latest.completed_at is not None
    assert latest == completed


@pytest.mark.asyncio
async def test_latest_result_returns_the_most_recent_of_several_completed_sessions(
    student, seeded_questions
):
    await _select_math_section(student)

    first = await _run_full_section_session(
        student, wrong_prompts=frozenset(seeded_questions["weak_prompts"])
    )
    second = await _run_full_section_session(student)

    # Distinguishable by score, so the assertion below can't pass on the
    # wrong session by coincidence.
    assert first.session_id != second.session_id
    assert first.score.correct != second.score.correct

    async with _request_scoped_session() as db:
        latest = await practice_service.get_latest_session_result(db, student)

    assert latest.session_id == second.session_id
    assert latest.score.correct == second.score.correct


@pytest.mark.asyncio
async def test_latest_result_ignores_abandoned_and_in_progress_sessions(student, seeded_questions):
    """Only scored sessions are results. An abandoned one, or the one the
    student is in the middle of right now, must not displace the last
    session they actually finished.
    """
    await _select_math_section(student)

    completed = await _run_full_section_session(student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )
    async with _request_scoped_session() as db:
        await practice_service.abandon_practice_session(db, student)

    async with _request_scoped_session() as db:
        await practice_service.start_practice_session(
            db, PracticeStartRequest(mode="section", question_count=4), student
        )

    async with _request_scoped_session() as db:
        latest = await practice_service.get_latest_session_result(db, student)

    assert latest.session_id == completed.session_id


@pytest.mark.asyncio
async def test_latest_result_is_scoped_to_the_requesting_student(student, seeded_questions):
    """One student's finished session must never surface on another's
    Results tab -- the query filters on student_id, not just status.
    """
    await _select_math_section(student)
    await _run_full_section_session(student)

    async with SessionLocal() as db:
        other = User(
            email=f"other-student-{uuid.uuid4().hex}@example.com",
            full_name="Other Student",
            role="student",
            is_active=True,
        )
        db.add(other)
        await db.commit()
        await db.refresh(other)

    async with _request_scoped_session() as db:
        with pytest.raises(HTTPException) as exc_info:
            await practice_service.get_latest_session_result(db, other)
    assert exc_info.value.status_code == 404
