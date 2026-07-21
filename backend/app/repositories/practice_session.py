from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.practice_session import PracticeSession
from app.repositories.base import BaseRepository

class PracticeSessionRepository(BaseRepository[PracticeSession]):
    def __init__(self):
        super().__init__(PracticeSession)

    async def get_active_session_for_student(self, db: AsyncSession, student_id: uuid.UUID) -> Optional[PracticeSession]:
        """
        Fetch the currently active/started practice session for a student.
        """
        query = select(PracticeSession).where(
            PracticeSession.student_id == student_id,
            PracticeSession.status == "started"
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_student(self, db: AsyncSession, student_id: uuid.UUID) -> List[PracticeSession]:
        """
        Fetch all practice sessions for a specific student.
        """
        query = select(PracticeSession).where(PracticeSession.student_id == student_id)
        result = await db.execute(query)
        return list(result.scalars().all())

practice_session_repository = PracticeSessionRepository()
