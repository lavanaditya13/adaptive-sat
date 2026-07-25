from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_plan import StudyPlan
from app.services.skill_scoring_service import get_student_progress


async def generate_study_plan_for_student(
    db: AsyncSession,
    student_id: int,
) -> StudyPlan:
    progress = await get_student_progress(db=db, student_id=student_id)
    weakest_topics = progress["weakest_topics"]

    items = []

    for topic in weakest_topics:
        accuracy = topic["accuracy"]

        if accuracy < 0.5:
            priority = "high"
            recommended_questions = 20
        elif accuracy < 0.7:
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
                "reason": f"Accuracy is {round(accuracy * 100)}%, so this topic should be reviewed.",
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