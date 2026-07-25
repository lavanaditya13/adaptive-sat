from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.practice import StudentDashboardResponse
from app.services.practice_service import get_student_dashboard

router = APIRouter()


@router.get("", response_model=StudentDashboardResponse)
async def student_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_student_dashboard(db=db, student_id=current_user.id)