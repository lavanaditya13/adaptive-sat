import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.study_plan import StudyPlan
from app.models.user import User
from app.schemas.study_plan import StudyPlanCreate, StudyPlanResponse
from app.services.recommendation_service import generate_study_plan_for_student

router = APIRouter()


@router.post("", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_study_plan(
    payload: StudyPlanCreate,
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, payload.student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    study_plan = StudyPlan(**payload.model_dump())

    db.add(study_plan)
    await db.commit()
    await db.refresh(study_plan)

    return study_plan


@router.get("", response_model=list[StudyPlanResponse])
async def list_study_plans(
    student_id: uuid.UUID | None = None,
    active_only: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(StudyPlan)

    if student_id:
        query = query.where(StudyPlan.student_id == student_id)

    if active_only:
        query = query.where(StudyPlan.status == "active")

    query = query.order_by(StudyPlan.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)

    return result.scalars().all()


@router.post("/students/{student_id}/generate", response_model=StudyPlanResponse)
async def generate_study_plan(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    return await generate_study_plan_for_student(db=db, student_id=student_id)


@router.get("/students/{student_id}/current", response_model=StudyPlanResponse)
async def get_current_study_plan(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.student_id == student_id)
        .where(StudyPlan.status == "active")
        .order_by(StudyPlan.created_at.desc())
        .limit(1)
    )

    study_plan = result.scalar_one_or_none()

    if not study_plan:
        raise HTTPException(status_code=404, detail="No active study plan found")

    return study_plan