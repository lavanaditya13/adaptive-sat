"""Tests for app/services/skill_scoring_service.py.

classify_mistake_type/compute_day_streak/compute_avg_session_minutes/
compute_accuracy_trend are pure functions -- no DB needed. get_student_progress
and compute_section_accuracy need real Attempt/Question rows, so those use
the shared `student` fixture against Postgres.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.topic import Topic
from app.services.skill_scoring_service import (
    classify_mistake_type,
    compute_accuracy_trend,
    compute_avg_session_minutes,
    compute_day_streak,
    compute_section_accuracy,
    get_student_progress,
)

CHOICES = {"A": "opt-a", "B": "opt-b", "C": "opt-c", "D": "opt-d"}


# --- classify_mistake_type ---------------------------------------------


def test_classify_mistake_type_returns_none_when_correct():
    assert classify_mistake_type(
        selected_answer="A", is_correct=True, time_spent_seconds=30, confidence_level=3
    ) is None


def test_classify_mistake_type_skipped_when_no_answer_selected():
    assert classify_mistake_type(
        selected_answer=None, is_correct=False, time_spent_seconds=30, confidence_level=3
    ) == "skipped"


def test_classify_mistake_type_likely_guess_when_fast():
    assert classify_mistake_type(
        selected_answer="B", is_correct=False, time_spent_seconds=5, confidence_level=None
    ) == "likely_guess"


def test_classify_mistake_type_misconception_when_confident_and_wrong():
    assert classify_mistake_type(
        selected_answer="B", is_correct=False, time_spent_seconds=60, confidence_level=5
    ) == "misconception"


def test_classify_mistake_type_low_confidence_when_unsure_and_wrong():
    assert classify_mistake_type(
        selected_answer="B", is_correct=False, time_spent_seconds=60, confidence_level=1
    ) == "low_confidence"


def test_classify_mistake_type_defaults_to_concept_gap():
    assert classify_mistake_type(
        selected_answer="B", is_correct=False, time_spent_seconds=60, confidence_level=3
    ) == "concept_gap"


# --- compute_day_streak --------------------------------------------------


def test_compute_day_streak_empty_history_is_zero():
    assert compute_day_streak([]) == 0


def test_compute_day_streak_counts_consecutive_days_ending_today():
    today = datetime.now(timezone.utc).date()
    dates = [today, today - timedelta(days=1), today - timedelta(days=2)]

    assert compute_day_streak(dates) == 3


def test_compute_day_streak_breaks_on_a_gap():
    today = datetime.now(timezone.utc).date()
    dates = [today, today - timedelta(days=2)]  # gap at yesterday

    assert compute_day_streak(dates) == 1


def test_compute_day_streak_allows_streak_ending_yesterday():
    today = datetime.now(timezone.utc).date()
    dates = [today - timedelta(days=1), today - timedelta(days=2)]

    assert compute_day_streak(dates) == 2


# --- compute_avg_session_minutes -----------------------------------------


def test_compute_avg_session_minutes_zero_sessions_is_zero():
    assert compute_avg_session_minutes(total_time_spent_seconds=600, sessions_completed=0) == 0.0


def test_compute_avg_session_minutes_divides_and_converts_to_minutes():
    assert compute_avg_session_minutes(total_time_spent_seconds=600, sessions_completed=5) == 2.0


# --- compute_accuracy_trend -----------------------------------------------


class _FakeAttempt:
    def __init__(self, created_at: datetime, is_correct: bool):
        self.created_at = created_at
        self.is_correct = is_correct


def test_compute_accuracy_trend_zero_when_no_older_attempts():
    now = datetime.now(timezone.utc)
    attempts = [_FakeAttempt(now, True)]

    assert compute_accuracy_trend(attempts) == 0.0


def test_compute_accuracy_trend_positive_when_recent_improves():
    now = datetime.now(timezone.utc)
    attempts = [
        _FakeAttempt(now - timedelta(days=10), False),  # older, wrong
        _FakeAttempt(now - timedelta(days=1), True),  # recent, correct
    ]

    assert compute_accuracy_trend(attempts) > 0


# --- get_student_progress / compute_section_accuracy (DB-backed) --------


async def _seed_attempt(db, *, student_id: int, topic_id: int, question_id: int, is_correct: bool):
    # Attempt.practice_session_id is NOT NULL, so every seeded attempt needs
    # a real (if otherwise unused) PracticeSession row to attach to.
    session = PracticeSession(
        student_id=student_id, section_id=1, mode="section", status="completed", question_count=1
    )
    db.add(session)
    await db.flush()

    attempt = Attempt(
        practice_session_id=session.id,
        student_id=student_id,
        question_id=question_id,
        topic_id=topic_id,
        selected_answer="A" if is_correct else "B",
        correct_answer="A",
        is_correct=is_correct,
    )
    db.add(attempt)


@pytest.mark.asyncio
async def test_get_student_progress_computes_weakest_topics(student, cleanup_after):
    async with SessionLocal() as db:
        weak_topic = Topic(code=f"SKILL_WEAK_{uuid.uuid4().hex[:8]}", name="Weak Topic")
        strong_topic = Topic(code=f"SKILL_STRONG_{uuid.uuid4().hex[:8]}", name="Strong Topic")
        db.add_all([weak_topic, strong_topic])
        await db.flush()
        cleanup_after.append((Topic, weak_topic.id))
        cleanup_after.append((Topic, strong_topic.id))

        weak_question = Question(
            section="math", prompt=f"Weak Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=weak_topic.id,
        )
        strong_question = Question(
            section="math", prompt=f"Strong Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=strong_topic.id,
        )
        db.add_all([weak_question, strong_question])
        await db.flush()

        await _seed_attempt(
            db, student_id=student.id, topic_id=weak_topic.id, question_id=weak_question.id, is_correct=False
        )
        await _seed_attempt(
            db, student_id=student.id, topic_id=strong_topic.id, question_id=strong_question.id, is_correct=True
        )
        await db.commit()

    async with SessionLocal() as db:
        progress = await get_student_progress(db=db, student_id=student.id)

    assert progress["total_attempted"] == 2
    assert progress["total_correct"] == 1
    weakest_ids = [t["topic_id"] for t in progress["weakest_topics"]]
    assert weak_topic.id in weakest_ids
    assert progress["weakest_topics"][0]["topic_id"] == weak_topic.id


@pytest.mark.asyncio
async def test_get_student_progress_with_no_attempts_returns_zeroed_summary(student):
    async with SessionLocal() as db:
        progress = await get_student_progress(db=db, student_id=student.id)

    assert progress["total_attempted"] == 0
    assert progress["overall_accuracy"] == 0
    assert progress["weakest_topics"] == []


@pytest.mark.asyncio
async def test_compute_section_accuracy_groups_by_section(student, cleanup_after):
    async with SessionLocal() as db:
        topic = Topic(code=f"SECTION_ACC_{uuid.uuid4().hex[:8]}", name="Section Accuracy Topic")
        db.add(topic)
        await db.flush()
        cleanup_after.append((Topic, topic.id))

        math_question = Question(
            section="math", prompt=f"Math Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=topic.id,
        )
        rw_question = Question(
            section="reading_writing", prompt=f"RW Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=topic.id,
        )
        db.add_all([math_question, rw_question])
        await db.flush()

        await _seed_attempt(
            db, student_id=student.id, topic_id=topic.id, question_id=math_question.id, is_correct=True
        )
        await _seed_attempt(
            db, student_id=student.id, topic_id=topic.id, question_id=rw_question.id, is_correct=False
        )
        await db.commit()

    async with SessionLocal() as db:
        section_accuracy = await compute_section_accuracy(db=db, student_id=student.id)

    assert section_accuracy["math"]["accuracy"] == 1.0
    assert section_accuracy["reading_writing"]["accuracy"] == 0.0
