import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.study_plan import StudyPlanCreate, StudyPlanResponse

router = APIRouter()

@router.post("", response_model=StudyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_study_plan(plan_in: StudyPlanCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new study plan.
    """
    now = datetime.now(timezone.utc)
    return StudyPlanResponse(
        id=uuid.uuid4(),
        student_id=plan_in.student_id,
        title=plan_in.title,
        description=plan_in.description,
        recommended_topics=plan_in.recommended_topics,
        is_active=plan_in.is_active,
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[StudyPlanResponse])
async def list_study_plans(student_id: Optional[uuid.UUID] = None, db: AsyncSession = Depends(get_db)):
    """
    List study plans, optionally filtered by student_id.
    """
    now = datetime.now(timezone.utc)
    return [
        StudyPlanResponse(
            id=uuid.uuid4(),
            student_id=student_id or uuid.uuid4(),
            title="Algebra Boost Plan",
            description="Focusing on linear equations and systems.",
            recommended_topics={
                "topics": [
                    {"topic_id": 1, "priority": "High", "target_date": "2026-07-20"}
                ]
            },
            is_active=True,
            created_at=now,
            updated_at=now
        )
    ]
