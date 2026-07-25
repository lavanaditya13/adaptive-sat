from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.question import Question
from app.repositories.base import BaseRepository

class QuestionRepository(BaseRepository[Question]):
    def __init__(self):
        super().__init__(Question)

    async def get_by_difficulty(self, db: AsyncSession, difficulty: str, limit: int = 100) -> List[Question]:
        """
        Fetch questions by difficulty level.
        """
        query = select(Question).where(Question.difficulty == difficulty).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_topic(self, db: AsyncSession, topic_id: int, limit: int = 100) -> List[Question]:
        """
        Fetch questions by topic ID.
        """
        query = select(Question).where(Question.topic_id == topic_id).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

question_repository = QuestionRepository()
