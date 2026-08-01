from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.question import Question
from app.models.topic import Topic


def classify_mistake_type(
    selected_answer: str | None,
    is_correct: bool,
    time_spent_seconds: int | None,
    confidence_level: int | None,
) -> str | None:
    if is_correct:
        return None

    if not selected_answer:
        return "skipped"

    if time_spent_seconds is not None and time_spent_seconds <= 10:
        return "likely_guess"

    if confidence_level is not None and confidence_level >= 4:
        return "misconception"

    if confidence_level is not None and confidence_level <= 2:
        return "low_confidence"

    return "concept_gap"


async def get_student_progress(db: AsyncSession, student_id: int) -> dict:
    result = await db.execute(
        select(Attempt).where(Attempt.student_id == student_id)
    )

    attempts = result.scalars().all()

    total_attempted = len(attempts)
    total_correct = sum(1 for attempt in attempts if attempt.is_correct)
    overall_accuracy = total_correct / total_attempted if total_attempted else 0

    topic_stats = defaultdict(lambda: {"attempted": 0, "correct": 0})

    for attempt in attempts:
        topic_stats[attempt.topic_id]["attempted"] += 1

        if attempt.is_correct:
            topic_stats[attempt.topic_id]["correct"] += 1

    performance_by_topic = []

    for topic_id, stats in topic_stats.items():
        topic = await db.get(Topic, topic_id)

        attempted = stats["attempted"]
        correct = stats["correct"]
        accuracy = correct / attempted if attempted else 0

        performance_by_topic.append(
            {
                "topic_id": topic_id,
                "topic_name": topic.name if topic else "Unknown Topic",
                "attempted": attempted,
                "correct": correct,
                "accuracy": round(accuracy, 2),
            }
        )

    weakest_topics = sorted(
        performance_by_topic,
        key=lambda topic: topic["accuracy"],
    )[:3]

    return {
        "student_id": student_id,
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "overall_accuracy": round(overall_accuracy, 2),
        "performance_by_topic": performance_by_topic,
        "weakest_topics": weakest_topics,
        "attempts": attempts,
    }


def compute_day_streak(attempt_dates: list[date]) -> int:
    """
    Computes a streak of consecutive UTC-calendar days with at least one
    attempt. Buckets by UTC date since no per-user timezone is tracked
    yet, so a streak can appear to break a few hours "early" for
    students west of UTC.
    """
    if not attempt_dates:
        return 0

    unique_dates = set(attempt_dates)
    today = datetime.now(timezone.utc).date()

    cursor = today if today in unique_dates else today - timedelta(days=1)

    streak = 0
    while cursor in unique_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


async def compute_section_accuracy(db: AsyncSession, student_id: int) -> dict[str, dict]:
    result = await db.execute(
        select(Question.section, Attempt.is_correct)
        .join(Question, Attempt.question_id == Question.id)
        .where(Attempt.student_id == student_id)
    )

    section_stats = defaultdict(lambda: {"attempted": 0, "correct": 0})

    for section, is_correct in result.all():
        section_stats[section]["attempted"] += 1

        if is_correct:
            section_stats[section]["correct"] += 1

    return {
        section: {
            "attempted": stats["attempted"],
            "correct": stats["correct"],
            "accuracy": round(stats["correct"] / stats["attempted"], 2)
            if stats["attempted"]
            else 0.0,
        }
        for section, stats in section_stats.items()
    }


def compute_avg_session_minutes(
    total_time_spent_seconds: int,
    sessions_completed: int,
) -> float:
    if not sessions_completed:
        return 0.0

    return round(total_time_spent_seconds / 60 / sessions_completed, 1)


def compute_accuracy_trend(attempts: list[Attempt]) -> float:
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=7)

    recent = [attempt for attempt in attempts if attempt.created_at >= recent_cutoff]
    older = [attempt for attempt in attempts if attempt.created_at < recent_cutoff]

    if not older:
        return 0.0

    recent_accuracy = (
        sum(1 for attempt in recent if attempt.is_correct) / len(recent) if recent else 0.0
    )
    older_accuracy = sum(1 for attempt in older if attempt.is_correct) / len(older)

    return round((recent_accuracy - older_accuracy) * 100, 1)