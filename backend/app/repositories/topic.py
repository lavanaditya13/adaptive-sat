from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.topic import Topic
from app.repositories.base import BaseRepository

class TopicRepository(BaseRepository[Topic]):
    def __init__(self):
        super().__init__(Topic)

    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Topic]:
        """
        Fetch a topic by its code.
        """
        query = select(Topic).where(Topic.code == code)
        result = await db.execute(query)
        return result.scalar_one_or_none()

topic_repository = TopicRepository()
