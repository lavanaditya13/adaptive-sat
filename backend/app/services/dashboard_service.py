from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PRACTICE_SESSION_STATUS_COMPLETED
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.section import Section
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import (
    DashboardProgressResponse,
    DashboardSectionResponse,
    DashboardStudentResponse,
    DashboardWeakTopicResponse,
    EstimatedScoreResponse,
    StudentDashboardResponse,
    UpdateTargetScoreRequest,
)
from app.services.scoring_service import get_estimated_score
from app.services.skill_scoring_service import (
    compute_accuracy_trend,
    compute_avg_session_minutes,
    compute_day_streak,
    compute_section_accuracy,
    get_student_progress,
)


async def _count_section_topics(db: AsyncSession, section_code: str) -> int:
    result = await db.execute(
        select(func.count(func.distinct(Topic.id)))
        .select_from(Topic)
        .join(Question, Question.topic_id == Topic.id)
        .where(Question.section == section_code)
    )
    return result.scalar_one()


async def _load_student(db: AsyncSession, student_id: int) -> User:
    student = await db.get(User, student_id)

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    return student


async def get_student_dashboard(
    db: AsyncSession,
    student_id: int,
) -> StudentDashboardResponse:
    student = await _load_student(db=db, student_id=student_id)

    progress = await get_student_progress(db=db, student_id=student_id)
    attempts = progress["attempts"]

    sessions_completed_result = await db.execute(
        select(func.count())
        .select_from(PracticeSession)
        .where(
            PracticeSession.student_id == student_id,
            PracticeSession.status == PRACTICE_SESSION_STATUS_COMPLETED,
        )
    )
    sessions_completed = sessions_completed_result.scalar_one()

    total_time_spent_seconds = sum(attempt.time_spent_seconds or 0 for attempt in attempts)

    day_streak = compute_day_streak([attempt.created_at.date() for attempt in attempts])
    section_accuracy = await compute_section_accuracy(db=db, student_id=student_id)
    avg_session_minutes = compute_avg_session_minutes(
        total_time_spent_seconds,
        sessions_completed,
    )
    accuracy_trend = compute_accuracy_trend(attempts)
    estimated_score = get_estimated_score(section_accuracy, student.target_score)

    sections_result = await db.execute(select(Section).order_by(Section.id.asc()))
    sections = list(sections_result.scalars().all())

    weak_topics: list[DashboardWeakTopicResponse] = []
    for index, topic in enumerate(progress.get("weakest_topics", []), start=1):
        weak_topics.append(
            DashboardWeakTopicResponse(
                topic_id=index,
                display_name=topic["topic_name"],
                mastery_score=round(topic["accuracy"] * 100, 1),
            )
        )

    dashboard_sections: list[DashboardSectionResponse] = []
    for section in sections:
        stats = section_accuracy.get(
            section.name,
            {"attempted": 0, "correct": 0, "accuracy": 0.0},
        )
        topics_count = await _count_section_topics(db=db, section_code=section.name)

        dashboard_sections.append(
            DashboardSectionResponse(
                section_id=section.id,
                name=section.name,
                display_name=section.display_name,
                accuracy_percentage=round(stats["accuracy"] * 100, 1),
                questions_completed=stats["attempted"],
                topics_count=topics_count,
            )
        )

    return StudentDashboardResponse(
        student=DashboardStudentResponse(full_name=student.full_name or ""),
        progress=DashboardProgressResponse(
            sessions_completed=sessions_completed,
            questions_answered=progress["total_attempted"],
            accuracy_percentage=round(progress["overall_accuracy"] * 100, 1),
            questions_correct=progress["total_correct"],
            accuracy_trend_percentage=accuracy_trend,
            avg_session_minutes=avg_session_minutes,
            day_streak=day_streak,
        ),
        weak_topics=weak_topics,
        sections=dashboard_sections,
        estimated_score=estimated_score,
    )


async def update_target_score(
    db: AsyncSession,
    student: User,
    request: UpdateTargetScoreRequest,
) -> EstimatedScoreResponse:
    student.target_score = request.target_score
    # Explicitly re-attach: in production `student` already comes from this
    # same request's db session (via get_current_user), so this is a no-op,
    # but it makes the function correct on its own terms rather than
    # implicitly depending on the caller's session state.
    db.add(student)
    await db.commit()

    section_accuracy = await compute_section_accuracy(db=db, student_id=student.id)
    return get_estimated_score(section_accuracy, student.target_score)
