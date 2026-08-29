from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.study_plan import StudyPlanResponse
from app.services.recommendation_service import (
    generate_study_plan_for_student,
    get_or_create_study_plan_for_student,
)

router = APIRouter()


@router.get("", response_model=StudyPlanResponse)
async def get_study_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_or_create_study_plan_for_student(db=db, student_id=current_user.id)


@router.post("/regenerate", response_model=StudyPlanResponse)
async def regenerate_study_plan(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await generate_study_plan_for_student(db=db, student_id=current_user.id)
