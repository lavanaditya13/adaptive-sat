from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.practice import TopicsResponse
from app.services.practice_service import get_topics_overview

router = APIRouter()


@router.get("", response_model=TopicsResponse)
async def list_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_topics_overview(db=db, student=current_user)
