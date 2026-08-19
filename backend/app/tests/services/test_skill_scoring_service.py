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
from app.services.practice_service import _load_section_topic_rows
from app.services.skill_scoring_service import (
    classify_mistake_type,
    compute_accuracy_trend,
    compute_avg_session_minutes,
    compute_day_streak,
    compute_section_accuracy,
    get_student_progress,
    get_weakest_skills,
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
async def test_weakest_topics_ranking_is_not_dominated_by_a_single_lucky_or_unlucky_attempt(
    student, cleanup_after
):
    """Regression test: weakest_topics used to sort by raw accuracy with no
    minimum-attempts floor, so one wrong answer (0% on 1 attempt) would
    outrank a topic practised heavily and still genuinely weak (40% on 20
    attempts) -- the opposite of what "weakest" should mean. Ranking by
    the BKT mastery_score instead fixes this: a single wrong answer isn't
    strong enough evidence to look worse than a real sustained weakness.
    """
    async with SessionLocal() as db:
        one_off_topic = Topic(code=f"ONE_OFF_{uuid.uuid4().hex[:8]}", name="One-off Miss")
        sustained_weak_topic = Topic(
            code=f"SUSTAINED_{uuid.uuid4().hex[:8]}", name="Sustained Weakness"
        )
        db.add_all([one_off_topic, sustained_weak_topic])
        await db.flush()
        cleanup_after.append((Topic, one_off_topic.id))
        cleanup_after.append((Topic, sustained_weak_topic.id))

        one_off_question = Question(
            section="math", prompt=f"One-off Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=one_off_topic.id,
        )
        sustained_question = Question(
            section="math", prompt=f"Sustained Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="easy", topic_id=sustained_weak_topic.id,
        )
        db.add_all([one_off_question, sustained_question])
        await db.flush()

        # One attempt, wrong -- 0% on paper.
        await _seed_attempt(
            db, student_id=student.id, topic_id=one_off_topic.id,
            question_id=one_off_question.id, is_correct=False,
        )

        # Twenty attempts, 40% correct -- a real, sustained weakness that
        # looks "better" than 0% by raw accuracy alone.
        for i in range(20):
            await _seed_attempt(
                db, student_id=student.id, topic_id=sustained_weak_topic.id,
                question_id=sustained_question.id, is_correct=(i % 5 == 0),
            )

        await db.commit()

    async with SessionLocal() as db:
        progress = await get_student_progress(db=db, student_id=student.id)

    weakest_ids = [t["topic_id"] for t in progress["weakest_topics"]]
    assert weakest_ids.index(sustained_weak_topic.id) < weakest_ids.index(one_off_topic.id)


@pytest.mark.asyncio
async def test_get_weakest_skills_ranks_by_mastery_score(student, cleanup_after):
    """The section's math curriculum is shared across tests (Topic/Question
    aren't truncated -- see conftest's _reset_student_state), so this
    resolves each of its own two topics' section-position rather than
    assuming they land at a fixed rank among however many other topics
    happen to exist, and only compares those two rows against each other.
    """
    async with SessionLocal() as db:
        weak_topic = Topic(
            code=f"WEAKEST_SKILL_{uuid.uuid4().hex[:8]}",
            name=f"Weakest Skill Topic {uuid.uuid4().hex[:8]}",
        )
        strong_topic = Topic(
            code=f"STRONGEST_SKILL_{uuid.uuid4().hex[:8]}",
            name=f"Strongest Skill Topic {uuid.uuid4().hex[:8]}",
        )
        db.add_all([weak_topic, strong_topic])
        await db.flush()
        cleanup_after.append((Topic, weak_topic.id))
        cleanup_after.append((Topic, strong_topic.id))

        weak_question = Question(
            section="math", prompt=f"Weakest Skill Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="medium", topic_id=weak_topic.id,
        )
        strong_question = Question(
            section="math", prompt=f"Strongest Skill Q {uuid.uuid4().hex[:8]}", choices=CHOICES,
            correct_answer="A", difficulty="medium", topic_id=strong_topic.id,
        )
        db.add_all([weak_question, strong_question])
        await db.flush()

        # One wrong answer on weak_topic; a sustained correct run on
        # strong_topic -- BKT should read these apart clearly.
        await _seed_attempt(
            db, student_id=student.id, topic_id=weak_topic.id,
            question_id=weak_question.id, is_correct=False,
        )
        for _ in range(5):
            await _seed_attempt(
                db, student_id=student.id, topic_id=strong_topic.id,
                question_id=strong_question.id, is_correct=True,
            )

        await db.commit()

    async with SessionLocal() as db:
        section_topics = await _load_section_topic_rows(db=db, section_code="math")
        ranked = await get_weakest_skills(
            db=db, student_id=student.id, section_code="math", limit=len(section_topics)
        )

    positions_by_topic_id = {topic.id: position for position, topic in enumerate(section_topics, start=1)}
    weak_row = next(row for row in ranked if row["topic_id"] == positions_by_topic_id[weak_topic.id])
    strong_row = next(row for row in ranked if row["topic_id"] == positions_by_topic_id[strong_topic.id])

    assert weak_row["mastery_score"] < strong_row["mastery_score"]
    assert ranked.index(weak_row) < ranked.index(strong_row)


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
