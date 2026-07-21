from typing import List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.attempt import Attempt
from app.repositories.base import BaseRepository

class AttemptRepository(BaseRepository[Attempt]):
    def __init__(self):
        super().__init__(Attempt)

    async def get_attempts_by_session(self, db: AsyncSession, session_id: uuid.UUID) -> List[Attempt]:
        """
        Fetch all answer attempts logged for a specific practice session.
        """
        query = select(Attempt).where(Attempt.practice_session_id == session_id)
        result = await db.execute(query)
        return list(result.scalars().all())

attempt_repository = AttemptRepository()
