from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.topic import TopicCreate, TopicResponse

router = APIRouter()

@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(topic_in: TopicCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new SAT topic.
    """
    now = datetime.now(timezone.utc)
    return TopicResponse(
        id=1,
        name=topic_in.name,
        code=topic_in.code,
        description=topic_in.description,
        parent_topic_id=topic_in.parent_topic_id,
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[TopicResponse])
async def list_topics(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    List all SAT topics.
    """
    now = datetime.now(timezone.utc)
    return [
        TopicResponse(
            id=1,
            name="Heart of Algebra",
            code="HEART_OF_ALGEBRA",
            description="Linear equations and systems of linear equations.",
            parent_topic_id=None,
            created_at=now,
            updated_at=now
        )
    ]
