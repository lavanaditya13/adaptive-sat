from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
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


async def get_student_progress(db: AsyncSession, student_id: UUID) -> dict:
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
                "topic_id": str(topic_id),
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
        "student_id": str(student_id),
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "overall_accuracy": round(overall_accuracy, 2),
        "performance_by_topic": performance_by_topic,
        "weakest_topics": weakest_topics,
    }