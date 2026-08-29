from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.constants import STUDY_PLAN_STATUS_ACTIVE
from app.models.study_plan import StudyPlan
from app.repositories.base import BaseRepository

class StudyPlanRepository(BaseRepository[StudyPlan]):
    def __init__(self):
        super().__init__(StudyPlan)

    async def get_by_student(self, db: AsyncSession, student_id: int) -> List[StudyPlan]:
        """
        Fetch all study plans (past and active) for a student.
        """
        query = select(StudyPlan).where(StudyPlan.student_id == student_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_latest_active_by_student(
        self, db: AsyncSession, student_id: int
    ) -> Optional[StudyPlan]:
        """
        Fetch the most recently created active study plan for a student, or
        None if they don't have one yet. Used by GET /api/v1/study-plan to
        decide whether an existing plan can be served as-is or a new one
        needs generating -- see recommendation_service.get_or_create_study_plan_for_student.
        """
        query = (
            select(StudyPlan)
            .where(
                StudyPlan.student_id == student_id,
                StudyPlan.status == STUDY_PLAN_STATUS_ACTIVE,
            )
            .order_by(StudyPlan.created_at.desc(), StudyPlan.id.desc())
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalars().first()

study_plan_repository = StudyPlanRepository()
