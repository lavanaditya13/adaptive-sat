from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
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

study_plan_repository = StudyPlanRepository()
