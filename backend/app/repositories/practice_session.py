from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.constants import ACTIVE_PRACTICE_SESSION_STATUSES
from app.models.practice_session import PracticeSession
from app.repositories.base import BaseRepository

class PracticeSessionRepository(BaseRepository[PracticeSession]):
    def __init__(self):
        super().__init__(PracticeSession)

    async def get_active_session_for_student(self, db: AsyncSession, student_id: int) -> Optional[PracticeSession]:
        """
        Fetch the currently active practice session for a student, if any.
        "Active" means in_progress (still answering) or ready_to_complete
        (all questions answered, /complete not yet called). Sessions are
        never given a status of "started". This is the single source of
        truth for the active-session query — app/services/practice_service.py
        calls this rather than re-implementing the predicate.
        """
        query = (
            select(PracticeSession)
            .where(
                PracticeSession.student_id == student_id,
                PracticeSession.status.in_(ACTIVE_PRACTICE_SESSION_STATUSES),
            )
            .order_by(PracticeSession.created_at.desc())
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_student(self, db: AsyncSession, student_id: int) -> List[PracticeSession]:
        """
        Fetch all practice sessions for a specific student.
        """
        query = select(PracticeSession).where(PracticeSession.student_id == student_id)
        result = await db.execute(query)
        return list(result.scalars().all())

practice_session_repository = PracticeSessionRepository()
