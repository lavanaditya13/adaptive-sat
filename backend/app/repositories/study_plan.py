from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.study_plan import StudyPlan
from app.repositories.base import BaseRepository

class StudyPlanRepository(BaseRepository[StudyPlan]):
    def __init__(self):
        super().__init__(StudyPlan)

    async def get_active_plan_for_student(self, db: AsyncSession, student_id: uuid.UUID) -> Optional[StudyPlan]:
        """
        Fetch the currently active study plan for a student.
        """
        query = select(StudyPlan).where(
            StudyPlan.student_id == student_id,
            StudyPlan.is_active == True
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_student(self, db: AsyncSession, student_id: uuid.UUID) -> List[StudyPlan]:
        """
        Fetch all study plans (past and active) for a student.
        """
        query = select(StudyPlan).where(StudyPlan.student_id == student_id)
        result = await db.execute(query)
        return list(result.scalars().all())

study_plan_repository = StudyPlanRepository()
