from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.practice import (
    EstimatedScoreResponse,
    StudentDashboardResponse,
    UpdateTargetScoreRequest,
)
from app.services.dashboard_service import get_student_dashboard, update_target_score

router = APIRouter()


@router.get("", response_model=StudentDashboardResponse)
async def student_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_student_dashboard(db=db, student_id=current_user.id)


@router.patch("/target-score", response_model=EstimatedScoreResponse)
async def patch_target_score(
    request: UpdateTargetScoreRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_target_score(db=db, student=current_user, request=request)
