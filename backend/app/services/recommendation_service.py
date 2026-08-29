from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_plan import StudyPlan
from app.repositories.study_plan import study_plan_repository
from app.services.skill_scoring_service import get_student_progress


async def generate_study_plan_for_student(
    db: AsyncSession,
    student_id: int,
) -> StudyPlan:
    progress = await get_student_progress(db=db, student_id=student_id)
    weakest_topics = progress["weakest_topics"]

    items = []

    for topic in weakest_topics:
        # Ranked by the BKT mastery_score (mastery_model.py), the same
        # weighted estimate get_student_progress already sorts weakest_topics
        # by -- not raw accuracy, which a single lucky/unlucky attempt can
        # swing far more than the weighted estimate does. Thresholds mirror
        # the old accuracy-based ones (0.5 / 0.7) applied to the 0-1
        # mastery_score scale instead; mastery_score's own "mastered" cutoff
        # is 0.90 (BktParameters.mastery_threshold), so anything below 0.7
        # is comfortably still worth prioritizing.
        mastery_score = topic["mastery_score"]

        if mastery_score < 0.5:
            priority = "high"
            recommended_questions = 20
        elif mastery_score < 0.7:
            priority = "medium"
            recommended_questions = 15
        else:
            priority = "low"
            recommended_questions = 10

        items.append(
            {
                "topic_id": topic["topic_id"],
                "topic_name": topic["topic_name"],
                "priority": priority,
                "recommended_questions": recommended_questions,
                "reason": (
                    f"Mastery score is {round(mastery_score * 100)}%, "
                    "so this topic should be reviewed."
                ),
            }
        )

    if not items:
        items.append(
            {
                "topic_id": None,
                "topic_name": "Mixed Practice",
                "priority": "medium",
                "recommended_questions": 10,
                "reason": "No attempts found yet. Start with mixed practice to establish a baseline.",
            }
        )

    study_plan = StudyPlan(
        student_id=student_id,
        title="Recommended Study Plan",
        status="active",
        items=items,
    )

    db.add(study_plan)
    await db.commit()
    await db.refresh(study_plan)

    return study_plan


async def get_or_create_study_plan_for_student(
    db: AsyncSession,
    student_id: int,
) -> StudyPlan:
    """Serve the student's most recently generated active StudyPlan, or
    generate one on the fly if they don't have one yet.

    Backs GET /api/v1/study-plan. StudyPlan rows are also written as a side
    effect of completing a practice session (see practice_service), so most
    of the time this just reads one back; the on-demand generation path only
    fires for a student who hasn't completed a session yet (or whose only
    plans were archived by changing `status` off "active").
    """
    existing = await study_plan_repository.get_latest_active_by_student(
        db=db, student_id=student_id
    )

    if existing is not None:
        return existing

    return await generate_study_plan_for_student(db=db, student_id=student_id)